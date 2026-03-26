'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import FollowerGrowthChart from '@/app/components/analytics/FollowerGrowthChart';
import InteractionsChart from '@/app/components/analytics/InteractionsChart';
import SafeResponsiveChart from '@/app/components/analytics/SafeResponsiveChart';
import { API_BASE_URL } from '@/app/config/api';
import { getUserFromToken, getValidToken } from '@/app/utils/jwt';
import type { FollowerGrowthData, InteractionData } from '@/app/types';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

const DAY_COUNT = 60;
const HYPOTHESIS_THRESHOLD = 15;

interface DayBucket {
  label: string;
  dayKey: string;
}

interface FollowRecord {
  followedId?: string;
  followingId?: string;
  createdAt?: string;
  created_at?: string;
}

function toRecordArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null);
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [record.data, record.result, record.items, record.rows, record.reactions, record.followers, record.posts];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null);
    }
  }

  return [];
}

function extractId(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const objectValue = raw as Record<string, unknown>;
    if (typeof objectValue.$oid === 'string') return objectValue.$oid;
    if (objectValue._id) return extractId(objectValue._id);
    if (objectValue.id) return extractId(objectValue.id);
  }
  return String(raw);
}

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toDayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatDayLabel(value: Date): string {
  return value.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
}

function getDayBuckets(): DayBucket[] {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const buckets: DayBucket[] = [];
  for (let index = DAY_COUNT - 1; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    buckets.push({
      label: formatDayLabel(day),
      dayKey: toDayKey(day),
    });
  }
  return buckets;
}

function findDayIndex(value: Date | null, buckets: DayBucket[]): number {
  if (!value) return -1;
  const key = toDayKey(value);
  return buckets.findIndex((bucket) => bucket.dayKey === key);
}

async function fetchJson(path: string, token: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status} consultando ${path}`);
  }

  return response.json();
}

function readNumericMetric(payload: unknown, keys: string[]): number | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const nested = [record.data, record.result]
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry));

  for (const key of keys) {
    const direct = record[key];
    if (typeof direct === 'number' && Number.isFinite(direct)) {
      return direct;
    }

    for (const node of nested) {
      const nestedValue = node[key];
      if (typeof nestedValue === 'number' && Number.isFinite(nestedValue)) {
        return nestedValue;
      }
    }
  }

  return undefined;
}

function percentChange(pre: number, post: number): number | null {
  if (pre <= 0) return null;
  return ((post - pre) / pre) * 100;
}

export default function HypothesisLinkOnlyView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followersSeries, setFollowersSeries] = useState<FollowerGrowthData[]>([]);
  const [interactionsSeries, setInteractionsSeries] = useState<InteractionData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const dayBuckets = useMemo(() => getDayBuckets(), []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const token = getValidToken();
      const user = token ? getUserFromToken(token) : null;
      const userId = user?.id;

      if (!token || !userId) {
        if (!cancelled) {
          setError('Inicia sesión para consultar datos del backend y evaluar la hipótesis.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const followerRequests = [
          fetchJson(`/follows/followers/${encodeURIComponent(userId)}`, token),
          fetchJson(`/follows?followingId=${encodeURIComponent(userId)}`, token),
          fetchJson(`/follows?followedId=${encodeURIComponent(userId)}`, token),
        ];

        const [followersResult, postsResult] = await Promise.all([
          Promise.any(followerRequests),
          fetchJson(`/posts?userId=${encodeURIComponent(userId)}`, token).catch(() => fetchJson('/posts', token)),
        ]);

        const followerRecords = toRecordArray(followersResult) as FollowRecord[];
        const matchingFollowerRecords = followerRecords.filter((record) => {
          const targetId = String(record.followedId ?? record.followingId ?? '');
          return targetId === userId;
        });

        const newFollowersByDay = dayBuckets.map(() => 0);
        matchingFollowerRecords.forEach((record) => {
          const createdDate = toDate(record.createdAt ?? record.created_at);
          const dayIndex = findDayIndex(createdDate, dayBuckets);
          if (dayIndex >= 0) {
            newFollowersByDay[dayIndex] += 1;
          }
        });

        const followersBaseline = Math.max(
          matchingFollowerRecords.length - newFollowersByDay.reduce((sum, current) => sum + current, 0),
          0
        );

        let cumulativeFollowers = followersBaseline;
        const builtFollowersSeries: FollowerGrowthData[] = dayBuckets.map((bucket, index) => {
          cumulativeFollowers += newFollowersByDay[index];
          return {
            week: bucket.label,
            followers: cumulativeFollowers,
            date: bucket.dayKey,
          };
        });

        const posts = toRecordArray(postsResult)
          .filter((post) => {
            const authorId = String(post.sql_user_id ?? post.authorId ?? '');
            return authorId === userId;
          })
          .map((post) => ({
            ...post,
            postId: extractId(post._id ?? post.id),
            createdAt: post.createdAt ?? post.created_at ?? post.date,
          }))
          .filter((post) => post.postId.length > 0);

        const reactionsResponses = await Promise.allSettled(
          posts.map((post) => fetchJson(`/posts/${encodeURIComponent(post.postId)}/reactions/total`, token))
        );

        const interactionsByDay = dayBuckets.map(() => 0);
        reactionsResponses.forEach((result, index) => {
          if (result.status !== 'fulfilled') return;

          const postDate = toDate(posts[index]?.createdAt);
          const dayIndex = findDayIndex(postDate, dayBuckets);
          if (dayIndex < 0) return;

          const totalFromAggregate = readNumericMetric(result.value, ['totalReactions', 'count', 'total']);
          interactionsByDay[dayIndex] += typeof totalFromAggregate === 'number' ? totalFromAggregate : 0;
        });

        const builtInteractionsSeries: InteractionData[] = dayBuckets.map((bucket, index) => ({
          week: bucket.label,
          interactions: interactionsByDay[index],
          date: bucket.dayKey,
        }));

        if (!cancelled) {
          setFollowersSeries(builtFollowersSeries);
          setInteractionsSeries(builtInteractionsSeries);
          setLastUpdated(new Date().toISOString());
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('No fue posible consultar datos del backend para evaluar la hipótesis.');
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [dayBuckets]);

  const analysis = useMemo(() => {
    const midpoint = Math.floor(DAY_COUNT / 2);

    const preFollowersDelta = followersSeries.length > 0
      ? followersSeries[midpoint - 1]?.followers - followersSeries[0]?.followers
      : 0;
    const postFollowersDelta = followersSeries.length > 0
      ? followersSeries[DAY_COUNT - 1]?.followers - followersSeries[midpoint]?.followers
      : 0;

    const preInteractions = interactionsSeries
      .slice(0, midpoint)
      .reduce((sum, row) => sum + row.interactions, 0);
    const postInteractions = interactionsSeries
      .slice(midpoint)
      .reduce((sum, row) => sum + row.interactions, 0);

    const visibilityPct = percentChange(preFollowersDelta, postFollowersDelta);
    const interactionsPct = percentChange(preInteractions, postInteractions);

    const visibilityMeets = visibilityPct !== null && visibilityPct >= HYPOTHESIS_THRESHOLD;
    const interactionsMeets = interactionsPct !== null && interactionsPct >= HYPOTHESIS_THRESHOLD;
    const hypothesisPass = visibilityMeets && interactionsMeets;

    return {
      preFollowersDelta,
      postFollowersDelta,
      preInteractions,
      postInteractions,
      visibilityPct,
      interactionsPct,
      visibilityMeets,
      interactionsMeets,
      hypothesisPass,
      comparisonChartData: [
        { metric: 'Visibilidad', pre: preFollowersDelta, post: postFollowersDelta },
        { metric: 'Interacción', pre: preInteractions, post: postInteractions },
      ],
      changeChartData: [
        { metric: 'Visibilidad %', value: visibilityPct ?? 0, threshold: HYPOTHESIS_THRESHOLD },
        { metric: 'Interacción %', value: interactionsPct ?? 0, threshold: HYPOTHESIS_THRESHOLD },
      ],
    };
  }, [followersSeries, interactionsSeries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-riff-bg via-riff-card to-riff-header">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-riff-primary text-xs tracking-[0.2em] uppercase">Vista privada por enlace</p>
          <h1 className="text-white text-2xl sm:text-3xl font-bold mt-2">Evaluación de Hipótesis de Impacto</h1>
          <p className="text-white/75 mt-3 leading-relaxed">
            Hipótesis: si se implementa una plataforma web especializada para la promoción de músicos locales,
            entonces la visibilidad e interacción de su contenido digital aumentarán al menos un 15%.
          </p>
          {lastUpdated ? (
            <p className="text-white/55 text-sm mt-3">
              Última actualización con datos del backend: {new Date(lastUpdated).toLocaleString('es-MX')}
            </p>
          ) : null}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-riff-card to-riff-header p-6">
            <h2 className="text-white text-xl font-bold mb-3">Marco teórico</h2>
            <ul className="space-y-2 text-white/80 text-sm leading-relaxed list-disc pl-5">
              <li>La economía de plataformas indica que al centralizar oferta y demanda se amplifican efectos de red e interacciones.</li>
              <li>En redes genéricas, el contenido local compite con volumen masivo y pierde descubrimiento orgánico.</li>
              <li>El modelo AIDA sugiere que una propuesta especializada mejora atención, interés y acción en audiencias de nicho.</li>
              <li>Usos y gratificaciones: una plataforma local satisface mejor necesidades de conexión social e información contextual.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-riff-card to-riff-header p-6">
            <h2 className="text-white text-xl font-bold mb-3">Problemática y objetivo</h2>
            <ul className="space-y-2 text-white/80 text-sm leading-relaxed list-disc pl-5">
              <li>Artistas locales no cuentan con una plataforma especializada para promocionar música, eventos y contacto en un solo flujo.</li>
              <li>El contenido se diluye en feeds generales, reduciendo visibilidad e interacción efectiva.</li>
              <li>Esto limita crecimiento profesional y difusión de cultura local.</li>
              <li>Objetivo: validar si la plataforma incrementa al menos 15% visibilidad e interacción.</li>
            </ul>
          </article>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/80">
            Cargando datos del backend para calcular la hipótesis...
          </section>
        ) : null}

        {error ? (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-amber-200">
            {error}
          </section>
        ) : null}

        {!loading && !error ? (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/60 text-xs uppercase tracking-[0.12em]">Cambio Visibilidad</p>
                <p className="text-white text-3xl font-bold mt-2">
                  {analysis.visibilityPct === null ? 'N/A' : `${analysis.visibilityPct.toFixed(1)}%`}
                </p>
                <p className={`text-xs mt-2 ${analysis.visibilityMeets ? 'text-green-300' : 'text-red-300'}`}>
                  {analysis.visibilityMeets ? 'Cumple umbral 15%' : 'No cumple umbral 15%'}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/60 text-xs uppercase tracking-[0.12em]">Cambio Interacción</p>
                <p className="text-white text-3xl font-bold mt-2">
                  {analysis.interactionsPct === null ? 'N/A' : `${analysis.interactionsPct.toFixed(1)}%`}
                </p>
                <p className={`text-xs mt-2 ${analysis.interactionsMeets ? 'text-green-300' : 'text-red-300'}`}>
                  {analysis.interactionsMeets ? 'Cumple umbral 15%' : 'No cumple umbral 15%'}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/60 text-xs uppercase tracking-[0.12em]">Veredicto de Hipótesis</p>
                <p className={`text-3xl font-bold mt-2 ${analysis.hypothesisPass ? 'text-green-300' : 'text-red-300'}`}>
                  {analysis.hypothesisPass ? 'SE CUMPLE' : 'NO SE CUMPLE'}
                </p>
                <p className="text-white/60 text-xs mt-2">Regla: ambos indicadores deben crecer al menos 15%</p>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FollowerGrowthChart data={followersSeries} />
              <InteractionsChart data={interactionsSeries} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-riff-card to-riff-header p-4 sm:p-6">
                <h3 className="text-white text-lg font-bold mb-4">Comparativa pre vs post</h3>
                <SafeResponsiveChart>
                  <BarChart data={analysis.comparisonChartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334" opacity={0.4} />
                    <XAxis dataKey="metric" stroke="#9aa" tick={{ fill: '#ccd', fontSize: 12 }} />
                    <YAxis stroke="#9aa" tick={{ fill: '#ccd', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.35)',
                        borderRadius: '10px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="pre" fill="#2B78D4" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="post" fill="#0FAE7C" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </SafeResponsiveChart>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-riff-card to-riff-header p-4 sm:p-6">
                <h3 className="text-white text-lg font-bold mb-4">Cambio porcentual vs umbral</h3>
                <SafeResponsiveChart>
                  <BarChart data={analysis.changeChartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334" opacity={0.4} />
                    <XAxis dataKey="metric" stroke="#9aa" tick={{ fill: '#ccd', fontSize: 12 }} />
                    <YAxis stroke="#9aa" tick={{ fill: '#ccd', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.35)',
                        borderRadius: '10px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="value" fill="#00A6FB" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="threshold" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </SafeResponsiveChart>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white text-lg font-bold mb-3">Síntesis metodológica</h3>
              <ul className="space-y-2 text-white/80 text-sm list-disc pl-5">
                <li>Se usa una ventana de 60 días de datos del backend del artista autenticado.</li>
                <li>Pre = días 1-30 y Post = días 31-60.</li>
                <li>Visibilidad se aproxima con crecimiento de seguidores por periodo.</li>
                <li>Interacción se aproxima con reacciones agregadas de publicaciones por periodo.</li>
                <li>La hipótesis se valida solo si ambos cambios porcentuales son mayores o iguales a 15%.</li>
              </ul>
            </section>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
