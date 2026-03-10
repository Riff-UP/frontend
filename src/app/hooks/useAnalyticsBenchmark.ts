'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAuthHeaders } from '@/app/config/api';
import type {
  AnalyticsActionResult,
  AnalyticsConfigEntry,
  AnalyticsConfigInput,
  AnalyticsExportInput,
  AnalyticsHealth,
  AnalyticsMetric,
  AnalyticsSnapshot,
  AnalyticsSnapshotInput,
  AnalyticsSummary,
  AnalyticsWorkloadInput,
} from '@/app/types';

const ANALYTICS_BASE_URL = '/api/analytics';
const ANALYTICS_ACCESS_TOKEN_KEY = 'riff.analytics.access-token';

const DEFAULT_HEALTH: AnalyticsHealth = {
  status: 'unknown',
  message: 'Sin datos todavía',
};

const DEFAULT_SUMMARY: AnalyticsSummary = {
  totalMetrics: 0,
  totalSnapshots: 0,
  activeConfigs: 0,
  latestSnapshotDate: null,
  totalCalls: 0,
  avgMeanExecTimeMs: 0,
  sentSnapshots: 0,
  pendingSnapshots: 0,
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }

  return fallback;
}

function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function pickArray(payload: unknown, keys: string[] = []): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates: unknown[] = [record.data, record.result, record.results, record.items, record.rows];

  for (const key of keys) {
    candidates.unshift(record[key]);
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const nested = pickArray(candidate, keys);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

function pickObject(payload: unknown, keys: string[] = []): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  const record = payload as Record<string, unknown>;
  const candidates: unknown[] = [record.data, record.result, record.summary, record.health, record.config];

  for (const key of keys) {
    candidates.unshift(record[key]);
  }

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
  }

  return record;
}

function extractMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  const directMessage = record.message ?? record.error ?? record.detail;

  if (typeof directMessage === 'string' && directMessage.trim()) {
    return directMessage;
  }

  if (Array.isArray(directMessage)) {
    return directMessage.map((item) => toStringValue(item)).join(', ');
  }

  const nested = [record.data, record.result, record.response];

  for (const candidate of nested) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return extractMessage(candidate, fallback);
    }
  }

  return fallback;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function cleanPayload<T extends Record<string, unknown>>(payload: T): T {
  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return acc;
    }

    acc[key as keyof T] = value as T[keyof T];
    return acc;
  }, {} as T);
}

function normalizeHealth(payload: unknown): AnalyticsHealth {
  const source = pickObject(payload);
  const status = toStringValue(source.status || source.state || (source.healthy ? 'ok' : ''), 'unknown');

  return {
    status,
    message: toStringValue(source.message || source.description, status === 'unknown' ? 'Sin información del servicio' : 'Servicio disponible'),
    service: toStringValue(source.service || source.name, 'Analytics Gateway'),
    checkedAt: toStringValue(source.checkedAt || source.checked_at || source.timestamp || source.updated_at, ''),
  };
}

function normalizeSummary(payload: unknown): AnalyticsSummary {
  const source = pickObject(payload, ['summary']);

  return {
    totalMetrics: toNumber(source.totalMetrics ?? source.total_metrics ?? source.metricsCount ?? source.metrics_count),
    totalSnapshots: toNumber(source.totalSnapshots ?? source.total_snapshots ?? source.snapshotCount ?? source.snapshots_count),
    activeConfigs: toNumber(source.activeConfigs ?? source.active_configs ?? source.configCount ?? source.config_count),
    latestSnapshotDate: toStringValue(source.latestSnapshotDate ?? source.latest_snapshot_date ?? source.lastSnapshotDate, '') || null,
    totalCalls: toNumber(source.totalCalls ?? source.total_calls),
    avgMeanExecTimeMs: toNumber(source.avgMeanExecTimeMs ?? source.avg_mean_exec_time_ms ?? source.averageMeanExecTimeMs),
    sentSnapshots: toNumber(source.sentSnapshots ?? source.sent_snapshots),
    pendingSnapshots: toNumber(source.pendingSnapshots ?? source.pending_snapshots),
  };
}

function normalizeMetrics(payload: unknown): AnalyticsMetric[] {
  return pickArray(payload, ['metrics']).map((row, index) => {
    const source = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;

    return {
      id: toStringValue(source.id ?? source.queryid ?? source.queryId, `metric-${index}`),
      queryid: toStringValue(source.queryid ?? source.queryId),
      dbid: toNullableNumber(source.dbid ?? source.dbId),
      userid: toNullableNumber(source.userid ?? source.userId),
      query: toStringValue(source.query ?? source.query_text ?? source.queryText),
      calls: toNumber(source.calls),
      total_exec_time_ms: toNumber(source.total_exec_time_ms ?? source.totalExecTimeMs),
      mean_exec_time_ms: toNumber(source.mean_exec_time_ms ?? source.meanExecTimeMs),
      min_exec_time_ms: toNumber(source.min_exec_time_ms ?? source.minExecTimeMs),
      max_exec_time_ms: toNumber(source.max_exec_time_ms ?? source.maxExecTimeMs),
      stddev_exec_time_ms: toNumber(source.stddev_exec_time_ms ?? source.stddevExecTimeMs),
      rows_returned: toNumber(source.rows_returned ?? source.rowsReturned),
      shared_blks_hit: toNumber(source.shared_blks_hit ?? source.sharedBlksHit),
      shared_blks_read: toNumber(source.shared_blks_read ?? source.sharedBlksRead),
      shared_blks_dirtied: toNumber(source.shared_blks_dirtied ?? source.sharedBlksDirtied),
      shared_blks_written: toNumber(source.shared_blks_written ?? source.sharedBlksWritten),
      temp_blks_read: toNumber(source.temp_blks_read ?? source.tempBlksRead),
      temp_blks_written: toNumber(source.temp_blks_written ?? source.tempBlksWritten),
      snapshot_date: toStringValue(source.snapshot_date ?? source.snapshotDate),
      ingestion_timestamp: toStringValue(source.ingestion_timestamp ?? source.ingestionTimestamp),
    };
  });
}

function normalizeSnapshots(payload: unknown): AnalyticsSnapshot[] {
  return pickArray(payload, ['snapshots']).map((row, index) => {
    const source = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;

    return {
      id: toStringValue(source.id, `snapshot-${index}`),
      snapshot_date: toStringValue(source.snapshot_date ?? source.snapshotDate),
      sent_to_bigquery: toBoolean(source.sent_to_bigquery ?? source.sentToBigquery),
      sent_at: toStringValue(source.sent_at ?? source.sentAt) || null,
      created_at: toStringValue(source.created_at ?? source.createdAt),
    };
  });
}

function normalizeConfig(payload: unknown): AnalyticsConfigEntry[] {
  return pickArray(payload, ['config', 'configs']).map((row, index) => {
    const source = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;

    return {
      id: toStringValue(source.id, `config-${index}`),
      variable_name: toStringValue(source.variable_name ?? source.variableName),
      variable_value: toStringValue(source.variable_value ?? source.variableValue),
      description: toStringValue(source.description),
      updated_at: toStringValue(source.updated_at ?? source.updatedAt),
    };
  });
}

interface UseAnalyticsBenchmarkOptions {
  enabled?: boolean;
  initialMetricsLimit?: number;
  initialSnapshotsLimit?: number;
}

interface UseAnalyticsBenchmarkReturn {
  health: AnalyticsHealth;
  summary: AnalyticsSummary;
  metrics: AnalyticsMetric[];
  snapshots: AnalyticsSnapshot[];
  configEntries: AnalyticsConfigEntry[];
  metricsLimit: number;
  snapshotsLimit: number;
  setMetricsLimit: (value: number) => void;
  setSnapshotsLimit: (value: number) => void;
  dashboardLoading: boolean;
  busyAction: string | null;
  dashboardError: string | null;
  actionError: string | null;
  actionMessage: string | null;
  lastUpdatedAt: string | null;
  analyticsAccessToken: string;
  setAnalyticsAccessToken: (token: string) => void;
  clearAnalyticsAccessToken: () => void;
  refreshDashboard: () => Promise<void>;
  upsertConfig: (input: AnalyticsConfigInput) => Promise<AnalyticsActionResult | null>;
  runWorkload: (input: AnalyticsWorkloadInput) => Promise<AnalyticsActionResult | null>;
  createSnapshot: (input: AnalyticsSnapshotInput) => Promise<AnalyticsActionResult | null>;
  exportMetrics: (input: AnalyticsExportInput) => Promise<AnalyticsActionResult | null>;
}

export function useAnalyticsBenchmark({
  enabled = true,
  initialMetricsLimit = 25,
  initialSnapshotsLimit = 10,
}: UseAnalyticsBenchmarkOptions = {}): UseAnalyticsBenchmarkReturn {
  const [health, setHealth] = useState<AnalyticsHealth>(DEFAULT_HEALTH);
  const [summary, setSummary] = useState<AnalyticsSummary>(DEFAULT_SUMMARY);
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshot[]>([]);
  const [configEntries, setConfigEntries] = useState<AnalyticsConfigEntry[]>([]);
  const [metricsLimit, setMetricsLimitState] = useState(initialMetricsLimit);
  const [snapshotsLimit, setSnapshotsLimitState] = useState(initialSnapshotsLimit);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [analyticsAccessToken, setAnalyticsAccessTokenState] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedToken = sessionStorage.getItem(ANALYTICS_ACCESS_TOKEN_KEY) || '';
    setAnalyticsAccessTokenState(storedToken);
  }, []);

  const request = useCallback(async (path: string, init?: RequestInit): Promise<unknown> => {
    const response = await fetch(`${ANALYTICS_BASE_URL}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        ...getAuthHeaders(!(init?.body instanceof FormData)),
        ...(init?.headers ?? {}),
      },
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      throw new Error(extractMessage(payload, `Error ${response.status} al consultar analytics`));
    }

    return payload;
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setDashboardLoading(true);
    setDashboardError(null);

    const results = await Promise.allSettled([
      request('/health'),
      request('/summary'),
      request(`/metrics?limit=${metricsLimit}`),
      request(`/snapshots?limit=${snapshotsLimit}`),
      request('/config'),
    ]);

    const [healthResult, summaryResult, metricsResult, snapshotsResult, configResult] = results;
    const failures: string[] = [];

    if (healthResult.status === 'fulfilled') {
      setHealth(normalizeHealth(healthResult.value));
    } else {
      failures.push(`health: ${healthResult.reason instanceof Error ? healthResult.reason.message : 'error desconocido'}`);
      setHealth(DEFAULT_HEALTH);
    }

    if (summaryResult.status === 'fulfilled') {
      setSummary(normalizeSummary(summaryResult.value));
    } else {
      failures.push(`summary: ${summaryResult.reason instanceof Error ? summaryResult.reason.message : 'error desconocido'}`);
      setSummary(DEFAULT_SUMMARY);
    }

    if (metricsResult.status === 'fulfilled') {
      setMetrics(normalizeMetrics(metricsResult.value));
    } else {
      failures.push(`metrics: ${metricsResult.reason instanceof Error ? metricsResult.reason.message : 'error desconocido'}`);
      setMetrics([]);
    }

    if (snapshotsResult.status === 'fulfilled') {
      setSnapshots(normalizeSnapshots(snapshotsResult.value));
    } else {
      failures.push(`snapshots: ${snapshotsResult.reason instanceof Error ? snapshotsResult.reason.message : 'error desconocido'}`);
      setSnapshots([]);
    }

    if (configResult.status === 'fulfilled') {
      setConfigEntries(normalizeConfig(configResult.value));
    } else {
      failures.push(`config: ${configResult.reason instanceof Error ? configResult.reason.message : 'error desconocido'}`);
      setConfigEntries([]);
    }

    setLastUpdatedAt(new Date().toISOString());
    setDashboardError(failures.length > 0 ? `Carga parcial: ${failures.join(' | ')}` : null);
    setDashboardLoading(false);
  }, [enabled, metricsLimit, request, snapshotsLimit]);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  const setAnalyticsAccessToken = useCallback((token: string) => {
    const nextValue = token.trim();
    setAnalyticsAccessTokenState(nextValue);

    if (typeof window !== 'undefined') {
      if (nextValue) {
        sessionStorage.setItem(ANALYTICS_ACCESS_TOKEN_KEY, nextValue);
      } else {
        sessionStorage.removeItem(ANALYTICS_ACCESS_TOKEN_KEY);
      }
    }
  }, []);

  const clearAnalyticsAccessToken = useCallback(() => {
    setAnalyticsAccessToken('');
  }, [setAnalyticsAccessToken]);

  const runAction = useCallback(async (
    actionName: string,
    path: string,
    body: Record<string, unknown>,
    successFallback: string,
  ): Promise<AnalyticsActionResult | null> => {
    setBusyAction(actionName);
    setActionError(null);
    setActionMessage(null);

    try {
      const payload = await request(path, {
        method: 'POST',
        body: JSON.stringify(cleanPayload(body)),
      });

      const result = {
        message: extractMessage(payload, successFallback),
        payload,
      } satisfies AnalyticsActionResult;

      setActionMessage(result.message);
      await refreshDashboard();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la acción';
      setActionError(message);
      return null;
    } finally {
      setBusyAction(null);
    }
  }, [refreshDashboard, request]);

  const upsertConfig = useCallback((input: AnalyticsConfigInput) => {
    return runAction('config', '/config', {
      variableName: input.variableName,
      variableValue: input.variableValue,
      description: input.description,
    }, 'Configuración guardada');
  }, [runAction]);

  const runWorkload = useCallback((input: AnalyticsWorkloadInput) => {
    return runAction('workload', '/workload/run', {
      iterations: input.iterations,
      resetStats: input.resetStats,
    }, 'Carga de prueba ejecutada');
  }, [runAction]);

  const createSnapshot = useCallback((input: AnalyticsSnapshotInput) => {
    return runAction('snapshot', '/snapshot', {
      accessToken: input.accessToken,
      executeWorkload: input.executeWorkload,
      iterations: input.iterations,
      limit: input.limit,
      resetStatsBeforeRun: input.resetStatsBeforeRun,
    }, 'Snapshot generado');
  }, [runAction]);

  const exportMetrics = useCallback((input: AnalyticsExportInput) => {
    return runAction('export', '/export', {
      accessToken: input.accessToken,
      executeWorkload: input.executeWorkload,
      iterations: input.iterations,
      limit: input.limit,
    }, 'Exportación lanzada');
  }, [runAction]);

  const stableSummary = useMemo(() => summary, [summary]);

  return {
    health,
    summary: stableSummary,
    metrics,
    snapshots,
    configEntries,
    metricsLimit,
    snapshotsLimit,
    setMetricsLimit: setMetricsLimitState,
    setSnapshotsLimit: setSnapshotsLimitState,
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
  };
}

