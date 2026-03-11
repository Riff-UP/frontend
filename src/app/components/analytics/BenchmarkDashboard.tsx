'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { useAnalyticsBenchmark } from '@/app/hooks/useAnalyticsBenchmark';
import type { AnalyticsConfigEntry, AnalyticsMetric } from '@/app/types';
import BenchmarkQueryPerformanceChart from './BenchmarkQueryPerformanceChart';
import BenchmarkSnapshotTrendChart from './BenchmarkSnapshotTrendChart';
import { API_BASE_URL } from '@/app/config/api';

const HIDDEN_ROUTE = '/lab/riff-benchmark-analytics-7f3k';
const ANALYTICS_OAUTH_STATE = 'riff-benchmark-view';
const ANALYTICS_OAUTH_ROUTE = `/api/analytics/auth/google?state=${ANALYTICS_OAUTH_STATE}`;
const ANALYTICS_OAUTH_POPUP_NAME = 'riff-analytics-oauth';
const ANALYTICS_OAUTH_MESSAGE_TYPE = 'analytics-oauth-success';

function toOrigin(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').origin;
  } catch {
    return null;
  }
}

function extractTextValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function formatOAuthPopupError(raw: string): string | null {
  const fallback = raw.trim();
  if (!fallback) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const message = extractTextValue(payload.message) || 'No se pudo completar OAuth con Google.';
    const errorCode = payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
      ? extractTextValue((payload.details as Record<string, unknown>).error)
      : '';
    const errorDescription = payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
      ? extractTextValue((payload.details as Record<string, unknown>).error_description)
      : '';

    if (errorCode === 'invalid_client') {
      return 'El gateway no está autorizado ante Google para intercambiar el authorization code. Revisa en backend el client_id, client_secret, redirect_uri y el método de autenticación del cliente OAuth. Si este frontend puede apuntar a más de un gateway de analytics, fija ANALYTICS_API_URL o NEXT_PUBLIC_ANALYTICS_API_URL al gateway correcto.';
    }

    if (errorDescription) {
      return `${message} (${errorDescription})`;
    }

    return message;
  } catch {
    return fallback;
  }
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-MX');
}

function formatMs(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }

  return `${value.toFixed(2)} ms`;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') || value.includes(':') ? 'short' : undefined,
  });
}

function shortenQueryLabel(metric: AnalyticsMetric, index: number): string {
  const source = metric.query?.trim() || metric.queryid || `Q${index + 1}`;
  const compact = source
    .replace(/\s+/g, ' ')
    .replace(/^select\s+/i, 'SELECT ')
    .replace(/^insert\s+/i, 'INSERT ')
    .replace(/^update\s+/i, 'UPDATE ')
    .replace(/^delete\s+/i, 'DELETE ');

  return compact.length > 18 ? `${compact.slice(0, 18)}…` : compact;
}

function getStatusClasses(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized.includes('ok') || normalized.includes('healthy') || normalized.includes('up')) {
    return 'text-green-300 bg-green-500/10 border-green-400/20';
  }

  if (normalized.includes('warn') || normalized.includes('partial')) {
    return 'text-amber-300 bg-amber-500/10 border-amber-400/20';
  }

  return 'text-red-300 bg-red-500/10 border-red-400/20';
}

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-2xl p-5 shadow-xl shadow-black/10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-5">
        <div>
          <h2 className="text-white text-lg sm:text-xl font-bold">{title}</h2>
          {subtitle ? <p className="text-white/60 text-sm mt-1">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onClick: () => unknown | Promise<unknown>;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const base = 'rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50';
  const styles = {
    primary: 'bg-riff-primary text-white hover:bg-riff-secondary',
    secondary: 'bg-riff-registro text-white hover:brightness-110',
    ghost: 'bg-white/5 text-white border border-white/10 hover:bg-white/10',
  };

  return (
    <button type="button" onClick={() => void onClick()} disabled={disabled} className={`${base} ${styles[variant]}`}>
      {label}
    </button>
  );
}

function MetricKpi({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-white/55 text-xs uppercase tracking-[0.18em]">{label}</p>
      <p className="text-white text-2xl font-bold mt-2">{value}</p>
      <p className="text-white/60 text-sm mt-2">{helper}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-10 text-center">
      <h3 className="text-white font-semibold">{title}</h3>
      <p className="text-white/60 text-sm mt-2 max-w-xl mx-auto">{description}</p>
    </div>
  );
}

export default function BenchmarkDashboard() {
  const [configForm, setConfigForm] = useState({
    variableName: '',
    variableValue: '',
    description: '',
  });
  const [workloadForm, setWorkloadForm] = useState({
    iterations: 50,
    resetStats: true,
  });
  const [snapshotForm, setSnapshotForm] = useState({
    executeWorkload: true,
    iterations: 50,
    limit: 100,
    resetStatsBeforeRun: true,
  });
  const [exportForm, setExportForm] = useState({
    executeWorkload: false,
    iterations: 50,
    limit: 100,
  });
  const [oauthTokenDraft, setOauthTokenDraft] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = useState<string | null>(null);
  const oauthPopupRef = useRef<Window | null>(null);
  const oauthPopupWatcherRef = useRef<number | null>(null);

  const {
    health,
    summary,
    metrics,
    snapshots,
    configEntries,
    metricsLimit,
    snapshotsLimit,
    setMetricsLimit,
    setSnapshotsLimit,
    dashboardLoading,
    busyAction,
    dashboardError,
    actionError,
    actionMessage,
    lastUpdatedAt,
    analyticsAccessToken,
    setAnalyticsAccessToken,
    clearAnalyticsAccessToken,
    refreshDashboard,
    upsertConfig,
    runWorkload,
    createSnapshot,
    exportMetrics,
  } = useAnalyticsBenchmark({
    initialMetricsLimit: 25,
    initialSnapshotsLimit: 10,
  });

  useEffect(() => {
    setOauthTokenDraft(analyticsAccessToken);
  }, [analyticsAccessToken]);

  const effectiveSummary = useMemo(() => {
    const totalCallsFromMetrics = metrics.reduce((sum, metric) => sum + metric.calls, 0);
    const meanLatency = metrics.length > 0
      ? metrics.reduce((sum, metric) => sum + metric.mean_exec_time_ms, 0) / metrics.length
      : 0;
    const sentSnapshots = snapshots.filter((snapshot) => snapshot.sent_to_bigquery).length;
    const pendingSnapshots = snapshots.filter((snapshot) => !snapshot.sent_to_bigquery).length;

    return {
      totalMetrics: summary.totalMetrics || metrics.length,
      totalSnapshots: summary.totalSnapshots || snapshots.length,
      activeConfigs: summary.activeConfigs || configEntries.length,
      latestSnapshotDate: summary.latestSnapshotDate || snapshots[0]?.snapshot_date || null,
      totalCalls: summary.totalCalls || totalCallsFromMetrics,
      avgMeanExecTimeMs: summary.avgMeanExecTimeMs || meanLatency,
      sentSnapshots: summary.sentSnapshots || sentSnapshots,
      pendingSnapshots: summary.pendingSnapshots || pendingSnapshots,
    };
  }, [configEntries.length, metrics, snapshots, summary]);

  const topMetrics = useMemo(() => {
    return [...metrics]
      .sort((left, right) => right.calls - left.calls)
      .slice(0, 6)
      .map((metric, index) => ({
        name: shortenQueryLabel(metric, index),
        calls: metric.calls,
        meanTime: metric.mean_exec_time_ms,
      }));
  }, [metrics]);

  const latencyMetrics = useMemo(() => {
    return [...metrics]
      .sort((left, right) => right.mean_exec_time_ms - left.mean_exec_time_ms)
      .slice(0, 6);
  }, [metrics]);

  const snapshotTrend = useMemo(() => {
    const grouped = new Map<string, { date: string; enviados: number; pendientes: number }>();

    snapshots.forEach((snapshot) => {
      const key = snapshot.snapshot_date || 'Sin fecha';
      const entry = grouped.get(key) || { date: key, enviados: 0, pendientes: 0 };
      if (snapshot.sent_to_bigquery) {
        entry.enviados += 1;
      } else {
        entry.pendientes += 1;
      }
      grouped.set(key, entry);
    });

    return Array.from(grouped.values()).slice(0, 8);
  }, [snapshots]);

  const handlePrefillConfig = (entry: AnalyticsConfigEntry) => {
    setConfigForm({
      variableName: entry.variable_name,
      variableValue: entry.variable_value,
      description: entry.description || '',
    });
  };

  const handleConfigSubmit = async () => {
    if (!configForm.variableName.trim() || !configForm.variableValue.trim()) {
      return;
    }

    const result = await upsertConfig({
      variableName: configForm.variableName.trim(),
      variableValue: configForm.variableValue.trim(),
      description: configForm.description.trim() || undefined,
    });

    if (result) {
      setConfigForm((current) => ({ ...current, description: '' }));
    }
  };

  const allowedOAuthOrigins = useMemo(() => {
    const origins = new Set<string>();
    const frontendOrigin = toOrigin(typeof window !== 'undefined' ? window.location.origin : null);
    const apiOrigin = toOrigin(API_BASE_URL);

    if (frontendOrigin) {
      origins.add(frontendOrigin);
    }

    if (apiOrigin) {
      origins.add(apiOrigin);
    }

    return origins;
  }, []);

  const clearOAuthPopupWatcher = () => {
    if (oauthPopupWatcherRef.current !== null) {
      window.clearInterval(oauthPopupWatcherRef.current);
      oauthPopupWatcherRef.current = null;
    }
  };

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (!allowedOAuthOrigins.has(event.origin)) {
        return;
      }

      const payload = event.data;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return;
      }

      const record = payload as Record<string, unknown>;
      if (record.type !== ANALYTICS_OAUTH_MESSAGE_TYPE) {
        return;
      }

      const messagePayload = record.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
        ? record.payload as Record<string, unknown>
        : null;
      const messageState = typeof messagePayload?.state === 'string' ? messagePayload.state : undefined;

      if (messageState && messageState !== ANALYTICS_OAUTH_STATE) {
        return;
      }

      clearOAuthPopupWatcher();
      oauthPopupRef.current = null;
      setOauthLoading(false);
      setOauthError(null);
      setOauthMessage('Callback OAuth recibido. Verificando conexión y refrescando panel…');
      void refreshDashboard();
    };

    window.addEventListener('message', handleOAuthMessage);

    return () => {
      window.removeEventListener('message', handleOAuthMessage);
      clearOAuthPopupWatcher();
    };
  }, [allowedOAuthOrigins, refreshDashboard]);

  useEffect(() => {
    if (!oauthLoading) {
      clearOAuthPopupWatcher();
    }
  }, [oauthLoading]);

  const openOAuthFlow = () => {
    setOauthLoading(true);
    setOauthError(null);
    setOauthMessage('Completa la autenticación en el popup de Google.');
    clearOAuthPopupWatcher();

    const popup = window.open(ANALYTICS_OAUTH_ROUTE, ANALYTICS_OAUTH_POPUP_NAME, 'popup=yes,width=640,height=760');

    if (!popup) {
      setOauthLoading(false);
      setOauthMessage(null);
      setOauthError('El navegador bloqueó el popup de OAuth. Permite ventanas emergentes e inténtalo de nuevo.');
      return;
    }

    popup.focus();
    oauthPopupRef.current = popup;
    oauthPopupWatcherRef.current = window.setInterval(() => {
      const currentPopup = oauthPopupRef.current;

      if (!currentPopup || currentPopup.closed) {
        clearOAuthPopupWatcher();
        oauthPopupRef.current = null;
        setOauthLoading(false);
        setOauthMessage(null);
        return;
      }

      try {
        const popupUrl = new URL(currentPopup.location.href);
        const sameOrigin = popupUrl.origin === window.location.origin;
        const looksLikeAnalyticsProxy = popupUrl.pathname.startsWith('/api/analytics');

        if (!sameOrigin || !looksLikeAnalyticsProxy) {
          return;
        }

        const popupBody = currentPopup.document.body?.innerText?.trim() || '';
        const popupError = formatOAuthPopupError(popupBody);

        if (!popupError) {
          return;
        }

        clearOAuthPopupWatcher();
        currentPopup.close();
        oauthPopupRef.current = null;
        setOauthLoading(false);
        setOauthMessage(null);
        setOauthError(popupError);
      } catch {
        // Mientras el popup esté en Google o en otra origin, no podemos inspeccionarlo.
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-riff-text-primary text-white flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-riff-header via-riff-card to-riff-primary-dark/70 p-6 sm:p-8 shadow-2xl shadow-black/20">
            <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-riff-primary/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-riff-registro/20 blur-3xl" />

            <div className="relative z-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`border rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(health.status)}`}>
                    Estado gateway: {health.status}
                  </span>
                  <span className="border border-white/10 bg-white/5 rounded-full px-3 py-1 text-xs font-semibold text-white/75">
                    Ruta especial por URL directa
                  </span>
                  <span className="border border-riff-primary/20 bg-riff-primary/10 rounded-full px-3 py-1 text-xs font-semibold text-riff-primary">
                    {HIDDEN_ROUTE}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black tracking-tight max-w-3xl">
                  Control de analytics y benchmarking desde una sola vista.
                </h1>
                <p className="text-white/70 text-sm sm:text-base mt-4 max-w-3xl leading-relaxed">
                  Esta pantalla está separada del perfil y de la navegación principal. Desde aquí puedes revisar salud del gateway,
                  métricas exportables, snapshots locales, configuración experimental y ejecutar acciones manuales hacia BigQuery.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <ActionButton label={dashboardLoading ? 'Actualizando…' : 'Refrescar panel'} onClick={refreshDashboard} disabled={dashboardLoading} />
                  <ActionButton label={oauthLoading ? 'Esperando OAuth…' : 'Abrir OAuth de Google'} onClick={openOAuthFlow} variant="secondary" disabled={oauthLoading} />
                  <ActionButton
                    label="Copiar ruta especial"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}${HIDDEN_ROUTE}`);
                    }}
                    variant="ghost"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/15 p-5 backdrop-blur-sm">
                <p className="text-white/55 text-xs uppercase tracking-[0.18em] mb-2">Control rápido</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/70 block mb-2">Límite de métricas</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={metricsLimit}
                      onChange={(event) => setMetricsLimit(Number(event.target.value) || 25)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-riff-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-2">Límite de snapshots</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={snapshotsLimit}
                      onChange={(event) => setSnapshotsLimit(Number(event.target.value) || 10)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-riff-primary"
                    />
                  </div>
                  <div className="text-sm text-white/60 space-y-1">
                    <p>Servicio: <span className="text-white">{health.service || 'Analytics Gateway'}</span></p>
                    <p>Última revisión: <span className="text-white">{formatDate(health.checkedAt || lastUpdatedAt)}</span></p>
                    <p>Última carga del panel: <span className="text-white">{formatDate(lastUpdatedAt)}</span></p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {dashboardError ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {dashboardError}
            </div>
          ) : null}

          {actionMessage ? (
            <div className="rounded-2xl border border-green-400/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
              {actionMessage}
            </div>
          ) : null}

          {actionError ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {actionError}
            </div>
          ) : null}

          {oauthError ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {oauthError}
            </div>
          ) : null}

          {oauthMessage ? (
            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
              {oauthMessage}
            </div>
          ) : null}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricKpi
              label="Métricas"
              value={formatNumber(effectiveSummary.totalMetrics)}
              helper={`Total de registros visibles en la consulta actual (${metricsLimit}).`}
            />
            <MetricKpi
              label="Llamadas"
              value={formatNumber(effectiveSummary.totalCalls)}
              helper="Suma total de ejecuciones acumuladas por las queries listadas."
            />
            <MetricKpi
              label="Latencia promedio"
              value={formatMs(effectiveSummary.avgMeanExecTimeMs)}
              helper="Promedio de mean_exec_time_ms con fallback derivado del listado actual."
            />
            <MetricKpi
              label="Snapshots"
              value={formatNumber(effectiveSummary.totalSnapshots)}
              helper={`${formatNumber(effectiveSummary.sentSnapshots)} enviados / ${formatNumber(effectiveSummary.pendingSnapshots)} pendientes.`}
            />
          </section>

          <SectionCard
            title="OAuth y token temporal"
            subtitle="El flujo de Google se mantiene aislado. Aquí solo guardas temporalmente el access token para snapshot y export."
            action={<span className="text-xs text-white/50">No se enlaza en navegación principal.</span>}
          >
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <div>
                <label className="text-sm text-white/70 block mb-2">Access token de BigQuery</label>
                <textarea
                  value={oauthTokenDraft}
                  onChange={(event) => setOauthTokenDraft(event.target.value)}
                  rows={4}
                  placeholder="Pega aquí el access_token que te entregue el flujo OAuth"
                  className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none focus:border-riff-primary resize-none"
                />
                <p className="text-xs text-white/45 mt-2">
                  Se guarda en <code>sessionStorage</code> del navegador, no en el backend. Si el gateway devuelve un callback exitoso,
                  este panel se refresca automáticamente.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 space-y-3">
                <ActionButton
                  label="Guardar token temporal"
                  onClick={() => setAnalyticsAccessToken(oauthTokenDraft)}
                  disabled={!oauthTokenDraft.trim()}
                />
                <ActionButton label="Limpiar token" onClick={clearAnalyticsAccessToken} variant="ghost" disabled={!analyticsAccessToken} />
                <ActionButton label={oauthLoading ? 'Esperando OAuth…' : 'Iniciar OAuth'} onClick={openOAuthFlow} variant="secondary" disabled={oauthLoading} />
                <div className="text-sm text-white/60 space-y-1">
                  <p>Token almacenado: <span className="text-white">{analyticsAccessToken ? 'Sí' : 'No'}</span></p>
                  <p>Último snapshot: <span className="text-white">{formatDate(effectiveSummary.latestSnapshotDate)}</span></p>
                </div>
              </div>
            </div>
          </SectionCard>

          <section className="grid gap-6 xl:grid-cols-3">
            <SectionCard title="Carga de prueba" subtitle="Genera actividad para alimentar pg_stat_statements antes de tomar snapshots.">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/70 block mb-2">Iteraciones</label>
                  <input
                    type="number"
                    min={1}
                    value={workloadForm.iterations}
                    onChange={(event) => setWorkloadForm((current) => ({ ...current, iterations: Number(event.target.value) || 1 }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-riff-primary"
                  />
                </div>
                <label className="flex items-center gap-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={workloadForm.resetStats}
                    onChange={(event) => setWorkloadForm((current) => ({ ...current, resetStats: event.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  Reiniciar estadísticas antes de correr la carga
                </label>
                <ActionButton
                  label={busyAction === 'workload' ? 'Ejecutando…' : 'Lanzar workload'}
                  onClick={() => runWorkload(workloadForm)}
                  disabled={busyAction !== null}
                />
              </div>
            </SectionCard>

            <SectionCard title="Snapshot manual" subtitle="Genera snapshot local usando tu token temporal para validar estructura y persistencia.">
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={snapshotForm.executeWorkload}
                    onChange={(event) => setSnapshotForm((current) => ({ ...current, executeWorkload: event.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  Ejecutar workload antes del snapshot
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-white/70 block mb-2">Iteraciones</label>
                    <input
                      type="number"
                      min={1}
                      value={snapshotForm.iterations}
                      onChange={(event) => setSnapshotForm((current) => ({ ...current, iterations: Number(event.target.value) || 1 }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-riff-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-2">Limit</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={snapshotForm.limit}
                      onChange={(event) => setSnapshotForm((current) => ({ ...current, limit: Number(event.target.value) || 1 }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-riff-primary"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={snapshotForm.resetStatsBeforeRun}
                    onChange={(event) => setSnapshotForm((current) => ({ ...current, resetStatsBeforeRun: event.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  Resetear stats antes de correr
                </label>
                <ActionButton
                  label={busyAction === 'snapshot' ? 'Generando…' : 'Crear snapshot'}
                  onClick={() => createSnapshot({ ...snapshotForm, accessToken: analyticsAccessToken || undefined })}
                  disabled={busyAction !== null || !analyticsAccessToken}
                  variant="secondary"
                />
              </div>
            </SectionCard>

            <SectionCard title="Exportación a BigQuery" subtitle="Usa el token OAuth guardado para enviar el lote actual al warehouse académico.">
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={exportForm.executeWorkload}
                    onChange={(event) => setExportForm((current) => ({ ...current, executeWorkload: event.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  Ejecutar workload antes de exportar
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-white/70 block mb-2">Iteraciones</label>
                    <input
                      type="number"
                      min={1}
                      value={exportForm.iterations}
                      onChange={(event) => setExportForm((current) => ({ ...current, iterations: Number(event.target.value) || 1 }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-riff-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-2">Limit</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={exportForm.limit}
                      onChange={(event) => setExportForm((current) => ({ ...current, limit: Number(event.target.value) || 1 }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-riff-primary"
                    />
                  </div>
                </div>
                <ActionButton
                  label={busyAction === 'export' ? 'Exportando…' : 'Exportar métricas'}
                  onClick={() => exportMetrics({ ...exportForm, accessToken: analyticsAccessToken || undefined })}
                  disabled={busyAction !== null || !analyticsAccessToken}
                />
              </div>
            </SectionCard>
          </section>

          <SectionCard
            title="Configuración experimental"
            subtitle="Consulta y actualiza variables como project_id_numeric, motor, estrategia de índices o dataset destino."
            action={<span className="text-xs text-white/50">Haz click en una fila para cargarla en el formulario.</span>}
          >
            {configEntries.length === 0 ? (
              <EmptyState title="Sin configuración disponible" description="Cuando el gateway responda /config aquí verás las variables del experimento y podrás editarlas." />
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/5 text-white/70">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Variable</th>
                        <th className="text-left px-4 py-3 font-medium">Valor</th>
                        <th className="text-left px-4 py-3 font-medium">Actualizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configEntries.map((entry) => (
                        <tr
                          key={entry.id || entry.variable_name}
                          className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                          onClick={() => handlePrefillConfig(entry)}
                        >
                          <td className="px-4 py-3 text-white font-medium">{entry.variable_name || '—'}</td>
                          <td className="px-4 py-3 text-white/70">{entry.variable_value || '—'}</td>
                          <td className="px-4 py-3 text-white/50">{formatDate(entry.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 space-y-4">
                  <div>
                    <label className="text-sm text-white/70 block mb-2">Variable</label>
                    <input
                      type="text"
                      value={configForm.variableName}
                      onChange={(event) => setConfigForm((current) => ({ ...current, variableName: event.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-riff-primary"
                      placeholder="project_id_numeric"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-2">Valor</label>
                    <input
                      type="text"
                      value={configForm.variableValue}
                      onChange={(event) => setConfigForm((current) => ({ ...current, variableValue: event.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-riff-primary"
                      placeholder="7"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-2">Descripción</label>
                    <textarea
                      rows={3}
                      value={configForm.description}
                      onChange={(event) => setConfigForm((current) => ({ ...current, description: event.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-riff-primary resize-none"
                      placeholder="ID académico del proyecto"
                    />
                  </div>
                  <ActionButton
                    label={busyAction === 'config' ? 'Guardando…' : 'Guardar variable'}
                    onClick={handleConfigSubmit}
                    disabled={busyAction !== null || !configForm.variableName.trim() || !configForm.variableValue.trim()}
                  />
                </div>
              </div>
            )}
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-2">
            {topMetrics.length > 0 ? (
              <BenchmarkQueryPerformanceChart data={topMetrics} />
            ) : (
              <EmptyState title="No hay métricas para graficar" description="Primero genera actividad con workload o ajusta el límite de métricas para empezar a ver tendencias." />
            )}

            {snapshotTrend.length > 0 ? (
              <BenchmarkSnapshotTrendChart data={snapshotTrend} />
            ) : (
              <EmptyState title="Sin historial de snapshots" description="Cuando se creen snapshots locales aquí verás su distribución entre enviados y pendientes." />
            )}
          </div>

          <SectionCard title="Métricas exportables" subtitle="Vista operacional de las queries capturadas por el pipeline. Se priorizan volumen, tiempo y bloques para benchmarking.">
            {metrics.length === 0 ? (
              <EmptyState title="No llegaron métricas" description="Revisa /api/analytics/metrics, ejecuta la carga de prueba o confirma que pg_stat_statements tenga actividad." />
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-3">
                  {latencyMetrics.slice(0, 3).map((metric, index) => (
                    <div key={`${metric.id}-highlight`} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Query crítica {index + 1}</p>
                      <p className="text-white font-semibold mt-2 line-clamp-2">{metric.query || metric.queryid || 'Sin query'}</p>
                      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                        <div>
                          <p className="text-white/45">Mean</p>
                          <p className="text-white font-semibold">{formatMs(metric.mean_exec_time_ms)}</p>
                        </div>
                        <div>
                          <p className="text-white/45">Calls</p>
                          <p className="text-white font-semibold">{formatNumber(metric.calls)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/5 text-white/70">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Query</th>
                        <th className="text-left px-4 py-3 font-medium">Calls</th>
                        <th className="text-left px-4 py-3 font-medium">Mean</th>
                        <th className="text-left px-4 py-3 font-medium">Total</th>
                        <th className="text-left px-4 py-3 font-medium">Rows</th>
                        <th className="text-left px-4 py-3 font-medium">Cache hit/read</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((metric) => (
                        <tr key={metric.id} className="border-t border-white/5 hover:bg-white/5 align-top">
                          <td className="px-4 py-3 max-w-xl">
                            <p className="text-white font-medium break-words whitespace-pre-wrap">{metric.query || metric.queryid || 'Sin query'}</p>
                            <p className="text-xs text-white/40 mt-1">queryid: {metric.queryid || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-white/70">{formatNumber(metric.calls)}</td>
                          <td className="px-4 py-3 text-white/70">{formatMs(metric.mean_exec_time_ms)}</td>
                          <td className="px-4 py-3 text-white/70">{formatMs(metric.total_exec_time_ms)}</td>
                          <td className="px-4 py-3 text-white/70">{formatNumber(metric.rows_returned)}</td>
                          <td className="px-4 py-3 text-white/70">{formatNumber(metric.shared_blks_hit)} / {formatNumber(metric.shared_blks_read)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Snapshots locales" subtitle="Auditoría simple del historial guardado antes o después de enviar a BigQuery.">
            {snapshots.length === 0 ? (
              <EmptyState title="Todavía no hay snapshots" description="Al generar un snapshot local, aquí aparecerá la evidencia de creación y envío." />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5 text-white/70">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">ID</th>
                      <th className="text-left px-4 py-3 font-medium">Fecha snapshot</th>
                      <th className="text-left px-4 py-3 font-medium">Estado</th>
                      <th className="text-left px-4 py-3 font-medium">Enviado en</th>
                      <th className="text-left px-4 py-3 font-medium">Creado en</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-white/70">{snapshot.id}</td>
                        <td className="px-4 py-3 text-white/70">{formatDate(snapshot.snapshot_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${snapshot.sent_to_bigquery ? 'text-green-300 bg-green-500/10 border-green-400/20' : 'text-amber-300 bg-amber-500/10 border-amber-400/20'}`}>
                            {snapshot.sent_to_bigquery ? 'Enviado' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/70">{formatDate(snapshot.sent_at)}</td>
                        <td className="px-4 py-3 text-white/70">{formatDate(snapshot.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </main>

      <Footer />
    </div>
  );
}

