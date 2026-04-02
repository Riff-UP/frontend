'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import SafeResponsiveChart from '@/app/components/analytics/SafeResponsiveChart';
import { API_BASE_URL } from '@/app/config/api';
import { getUserFromToken, getValidToken } from '@/app/utils/jwt';
import { toPng, toSvg } from 'html-to-image';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const MID_MONTH_DAY = 15;
const HYPOTHESIS_THRESHOLD = 15;

interface DayBucket {
  label: string;
  dayKey: string;
}

interface DataAudit {
  scopeMode: 'global' | 'my';
  dailyEndpointUsed: boolean;
  dailyRows: number;
  usersFetched: number;
  usersActive: number;
  usersCreatedPre: number;
  usersCreatedPost: number;
  followsFetched: number;
  followsAfterFilter: number;
  followsDroppedByInactiveUsers: number;
  followsPre: number;
  followsPost: number;
  postsFetched: number;
  postsAfterFilter: number;
  reactionsFetched: number;
  reactionsAfterFilter: number;
  reactionsPre: number;
  reactionsPost: number;
  reactionsSource: 'direct' | 'fallback-by-post';
}

interface SeriesRow {
  day: string;
  date: string;
  users: number;
  followers: number;
  interactions: number;
}

interface DailyMetricsPayload {
  usersByDay: number[];
  followsByDay: number[];
  usersBaseline: number;
  followsBaseline: number;
  rows: number;
}

function toRecordArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null);
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [record.data, record.result, record.items, record.rows, record.reactions, record.followers, record.posts, record.users];
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

function getHypothesisRangeIso(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, Math.min(MID_MONTH_DAY, new Date(year, month + 1, 0).getDate()));
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  return { from: toDayKey(from), to: toDayKey(to) };
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeDailyMetricsPayload(payload: unknown, buckets: DayBucket[]): DailyMetricsPayload | null {
  const rows = toRecordArray(payload);
  if (rows.length === 0) {
    return null;
  }

  const usersByDay = buckets.map(() => 0);
  const followsByDay = buckets.map(() => 0);

  rows.forEach((row) => {
    const rowDate = toDate(row.date ?? row.metric_date ?? row.day ?? row.dayKey);
    const index = findDayIndex(rowDate, buckets);
    if (index < 0) return;

    const users = toNumber(row.newUsers ?? row.users ?? row.usersCreated ?? row.new_users);
    const follows = toNumber(row.newFollows ?? row.follows ?? row.new_follows ?? row.followsCreated);

    usersByDay[index] += users;
    followsByDay[index] += follows;
  });

  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const usersBaseline = toNumber(
    source.usersBaseline ?? source.users_baseline ?? source.totalUsersBeforeFrom ?? source.total_users_before_from,
    0,
  );
  const followsBaseline = toNumber(
    source.followsBaseline ?? source.follows_baseline ?? source.totalFollowsBeforeFrom ?? source.total_follows_before_from,
    0,
  );

  return {
    usersByDay,
    followsByDay,
    usersBaseline,
    followsBaseline,
    rows: rows.length,
  };
}

function getDayBuckets(): DayBucket[] {
  const buckets: DayBucket[] = [];
  const { from, to } = getHypothesisRangeIso();
  const cursor = new Date(from);
  const toDate = new Date(to);

  while (cursor <= toDate) {
    buckets.push({
      label: formatDayLabel(cursor),
      dayKey: toDayKey(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
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

function isSoftDeletedRecord(record: Record<string, unknown>): boolean {
  const deletedAt = record.deletedAt ?? record.deleted_at;
  if (typeof deletedAt === 'string' && deletedAt.trim() !== '') return true;
  if (deletedAt instanceof Date) return true;

  const isDeleted = record.isDeleted ?? record.is_deleted;
  if (isDeleted === true || isDeleted === 1 || isDeleted === 'true' || isDeleted === '1') return true;

  const deletedFlag = record.deleted;
  if (deletedFlag === true || deletedFlag === 1 || deletedFlag === 'true' || deletedFlag === '1') return true;

  const statusValue = record.status;
  if (statusValue === false || statusValue === 0 || statusValue === 'false' || statusValue === '0') return true;
  if (typeof statusValue === 'string') {
    const normalized = statusValue.trim().toLowerCase();
    if (normalized === 'deleted' || normalized === 'inactive' || normalized === 'archived') {
      return true;
    }
  }

  return false;
}

function recordKey(record: Record<string, unknown>, fallbackPrefix: string, index: number): string {
  const rawId = record.id ?? record._id;
  const id = extractId(rawId);
  if (id) return `${fallbackPrefix}:id:${id}`;

  const createdAt = String(record.createdAt ?? record.created_at ?? '');
  const left = String(record.followerId ?? record.followingId ?? record.followedId ?? record.sql_user_id ?? '');
  const right = String(record.post_id ?? record.postId ?? record.userId ?? '');
  return `${fallbackPrefix}:composite:${left}:${right}:${createdAt}:${index}`;
}

function dedupeRecords(rows: Record<string, unknown>[], prefix: string): Record<string, unknown>[] {
  const seen = new Set<string>();
  const deduped: Record<string, unknown>[] = [];

  rows.forEach((row, index) => {
    const key = recordKey(row, prefix, index);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(row);
  });

  return deduped;
}

function extractUserIdFromAny(record: Record<string, unknown>): string {
  return String(
    record.id ??
    record.userId ??
    record.sql_user_id ??
    record.followerId ??
    record.followingId ??
    record.followedId ??
    ''
  );
}

function isActiveUserRecord(record: Record<string, unknown>): boolean {
  if (isSoftDeletedRecord(record)) return false;

  const status = record.status;
  if (status === undefined || status === null) return true;
  if (status === true || status === 1 || status === 'true' || status === '1') return true;
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    return normalized === 'active' || normalized === 'enabled';
  }
  return false;
}

function percentChange(pre: number, post: number): number | null {
  if (pre <= 0) return null;
  return ((post - pre) / pre) * 100;
}

function toMultiplierFromPct(pct: number | null): number | null {
  if (pct === null) return null;
  const multiplier = 1 + (pct / 100);
  if (!Number.isFinite(multiplier) || multiplier < 0) return null;
  return multiplier;
}

function formatReadableChange(pct: number | null): { main: string; detail: string } {
  if (pct === null) {
    return { main: 'N/A', detail: 'Sin base pre suficiente para calcular porcentaje' };
  }

  if (Math.abs(pct) < 200) {
    return { main: `${pct.toFixed(1)}%`, detail: 'Cambio porcentual directo' };
  }

  const multiplier = toMultiplierFromPct(pct);
  if (multiplier !== null) {
    return { main: `${multiplier.toFixed(2)}x`, detail: `Equivale a ${pct.toFixed(1)}%` };
  }

  return { main: `${pct.toFixed(1)}%`, detail: 'Cambio porcentual directo' };
}

function triggerDownload(filename: string, dataUrl: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function formatPct(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function formatNum(value: number): string {
  return value.toLocaleString('es-MX');
}

export default function HypothesisEvidenceExportView() {
  const [scopeMode, setScopeMode] = useState<'global' | 'my'>('global');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [audit, setAudit] = useState<DataAudit | null>(null);
  const [busyDownload, setBusyDownload] = useState<string | null>(null);

  const trendChartRef = useRef<HTMLDivElement | null>(null);
  const comparisonChartRef = useRef<HTMLDivElement | null>(null);
  const growthChartRef = useRef<HTMLDivElement | null>(null);

  const dayBuckets = useMemo(() => getDayBuckets(), []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const token = getValidToken();
      if (!token) {
        if (!cancelled) {
          setError('Inicia sesión para generar evidencia con datos reales del backend.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const currentUserId = getUserFromToken(token)?.id || '';
        const range = getHypothesisRangeIso();
        const scopeParam = scopeMode === 'my' ? 'user' : 'global';
        const scopeQuery = scopeMode === 'my' && currentUserId ? `&userId=${encodeURIComponent(currentUserId)}` : '';

        const dailyPayload = await fetchJson(
          `/analytics/hypothesis/daily?from=${range.from}&to=${range.to}&scope=${scopeParam}${scopeQuery}`,
          token,
        ).catch(() => null);
        const dailyMetrics = normalizeDailyMetricsPayload(dailyPayload, dayBuckets);

        const [usersResult, followsResult, postsResult, reactionsResult] = await Promise.all([
          fetchJson('/users?limit=5000&offset=0', token)
            .catch(() => fetchJson('/users/artists?limit=5000&offset=0', token))
            .catch(() => []),
          fetchJson('/follows', token).catch(() => fetchJson('/follows?page=1&limit=5000', token)),
          fetchJson('/posts', token),
          fetchJson('/posts/reactions', token).catch(() => []),
        ]);

        const rawUsers = toRecordArray(usersResult);
        const rawFollows = toRecordArray(followsResult);
        const rawPosts = toRecordArray(postsResult);
        const rawReactions = toRecordArray(reactionsResult);

        const activeUserIds = new Set(
          rawUsers
            .filter((record) => isActiveUserRecord(record))
            .map((record) => extractUserIdFromAny(record))
            .filter((id) => id.length > 0)
        );

        const targetUserIds = scopeMode === 'my'
          ? (currentUserId ? [currentUserId] : [])
          : Array.from(activeUserIds);

        if (targetUserIds.length === 0) {
          throw new Error('No se encontraron usuarios objetivo para el alcance seleccionado.');
        }

        const dedupedFollows = dedupeRecords(rawFollows, 'follow');
        const dedupedPosts = dedupeRecords(rawPosts, 'post');
        const dedupedReactions = dedupeRecords(rawReactions, 'reaction');

        let followsWithoutSoftDelete = dedupedFollows.filter((record) => !isSoftDeletedRecord(record));

        // Si el endpoint global viene scopeado por sesión, fuerza agregación por usuario objetivo.
        if (scopeMode === 'global' && followsWithoutSoftDelete.length < Math.max(targetUserIds.length / 3, 10)) {
          const followChunks = await Promise.allSettled(
            targetUserIds.map((userId) => fetchJson(`/follows?followedId=${encodeURIComponent(userId)}`, token))
          );
          const expanded = followChunks
            .filter((result): result is PromiseFulfilledResult<unknown> => result.status === 'fulfilled')
            .flatMap((result) => toRecordArray(result.value));
          followsWithoutSoftDelete = dedupeRecords(expanded, 'follow-expanded').filter((record) => !isSoftDeletedRecord(record));
        }

        const targetUserIdSet = new Set(targetUserIds);
        const targetUsers = rawUsers.filter((record) => targetUserIdSet.has(extractUserIdFromAny(record)));
        const validFollows = followsWithoutSoftDelete.filter((record) => {
          const followerId = String(record.followerId ?? '');
          const followedId = String(record.followedId ?? record.followingId ?? '');
          if (!followerId || !followedId) return false;
          if (activeUserIds.size > 0 && (!activeUserIds.has(followerId) || !activeUserIds.has(followedId))) return false;
          return targetUserIdSet.has(followedId);
        });

        const followsDroppedByInactiveUsers = Math.max(followsWithoutSoftDelete.length - validFollows.length, 0);

        let posts = dedupedPosts.filter((record) => !isSoftDeletedRecord(record));

        // Refuerza alcance por usuario objetivo.
        posts = posts.filter((record) => {
          const authorId = String(record.sql_user_id ?? record.authorId ?? record.userId ?? '');
          return targetUserIdSet.has(authorId);
        });

        // Si el endpoint /posts viene scopeado por sesión, agrega posts por usuario objetivo.
        if (scopeMode === 'global' && posts.length < Math.max(targetUserIds.length / 4, 8)) {
          const perUserPosts = await Promise.allSettled(
            targetUserIds.map((userId) => fetchJson(`/posts?userId=${encodeURIComponent(userId)}`, token))
          );
          const expandedPosts = perUserPosts
            .filter((result): result is PromiseFulfilledResult<unknown> => result.status === 'fulfilled')
            .flatMap((result) => toRecordArray(result.value));
          posts = dedupeRecords(expandedPosts, 'post-expanded')
            .filter((record) => !isSoftDeletedRecord(record));
        }

        const reactions = dedupedReactions.filter((record) => !isSoftDeletedRecord(record));

        let followersByDay = dayBuckets.map(() => 0);
        let usersByDay = dayBuckets.map(() => 0);

        targetUsers.forEach((record) => {
          const createdDate = toDate(record.createdAt ?? record.created_at ?? record.date);
          const index = findDayIndex(createdDate, dayBuckets);
          if (index >= 0) {
            usersByDay[index] += 1;
          }
        });

        validFollows.forEach((record) => {
          const created = toDate(record.createdAt ?? record.created_at);
          const index = findDayIndex(created, dayBuckets);
          if (index >= 0) followersByDay[index] += 1;
        });

        if (dailyMetrics) {
          usersByDay = dailyMetrics.usersByDay;
          followersByDay = dailyMetrics.followsByDay;
        }

        const usersBaseline = dailyMetrics
          ? dailyMetrics.usersBaseline
          : Math.max(targetUsers.length - usersByDay.reduce((sum, value) => sum + value, 0), 0);

        const followersBaseline = dailyMetrics
          ? dailyMetrics.followsBaseline
          : Math.max(validFollows.length - followersByDay.reduce((sum, value) => sum + value, 0), 0);

        let accumulatedFollowers = followersBaseline;
        let accumulatedUsers = usersBaseline;
        const followersSeries = dayBuckets.map((bucket, index) => {
          accumulatedFollowers += followersByDay[index];
          accumulatedUsers += usersByDay[index];
          return {
            day: bucket.label,
            date: bucket.dayKey,
            users: accumulatedUsers,
            followers: accumulatedFollowers,
            interactions: 0,
          };
        });

        const interactionsByDay = dayBuckets.map(() => 0);
        let reactionsSource: 'direct' | 'fallback-by-post' = 'direct';

        if (reactions.length > 0) {
          reactions.forEach((record) => {
            const created = toDate(record.createdAt ?? record.created_at);
            const index = findDayIndex(created, dayBuckets);
            if (index >= 0) interactionsByDay[index] += 1;
          });
        } else {
          reactionsSource = 'fallback-by-post';
          const postsWithId = posts
            .map((post) => ({ ...post, postId: extractId(post._id ?? post.id), createdAt: post.createdAt ?? post.created_at ?? post.date }))
            .filter((post) => String(post.postId).length > 0);

          const totals = await Promise.allSettled(
            postsWithId.map((post) => fetchJson(`/posts/${encodeURIComponent(String(post.postId))}/reactions/total`, token))
          );

          totals.forEach((result, index) => {
            if (result.status !== 'fulfilled') return;
            const postDate = toDate(postsWithId[index]?.createdAt);
            const dayIndex = findDayIndex(postDate, dayBuckets);
            if (dayIndex < 0) return;

            const payload = result.value as Record<string, unknown>;
            const direct = payload.totalReactions ?? payload.count ?? payload.total;
            const nested = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : {};
            const nestedValue = nested.totalReactions ?? nested.count ?? nested.total;
            const count = typeof direct === 'number' ? direct : typeof nestedValue === 'number' ? nestedValue : 0;
            interactionsByDay[dayIndex] += count;
          });
        }

        const builtSeries = followersSeries.map((row, index) => ({
          ...row,
          interactions: interactionsByDay[index],
        }));

        const midpoint = Math.max(1, Math.floor(dayBuckets.length / 2));
        const followsPre = followersByDay.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
        const followsPost = followersByDay.slice(midpoint).reduce((sum, value) => sum + value, 0);
        const usersCreatedPre = usersByDay.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
        const usersCreatedPost = usersByDay.slice(midpoint).reduce((sum, value) => sum + value, 0);
        const reactionsPre = interactionsByDay.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
        const reactionsPost = interactionsByDay.slice(midpoint).reduce((sum, value) => sum + value, 0);

        if (!cancelled) {
          setSeries(builtSeries);
          setAudit({
            scopeMode,
            dailyEndpointUsed: dailyMetrics !== null,
            dailyRows: dailyMetrics?.rows ?? 0,
            usersFetched: rawUsers.length,
            usersActive: activeUserIds.size,
            usersCreatedPre,
            usersCreatedPost,
            followsFetched: rawFollows.length,
            followsAfterFilter: validFollows.length,
            followsDroppedByInactiveUsers,
            followsPre,
            followsPost,
            postsFetched: rawPosts.length,
            postsAfterFilter: posts.length,
            reactionsFetched: rawReactions.length,
            reactionsAfterFilter: reactions.length,
            reactionsPre,
            reactionsPost,
            reactionsSource,
          });
          setLastUpdated(new Date().toISOString());
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('No fue posible cargar datos del backend para generar evidencia exportable.');
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [dayBuckets, scopeMode]);

  const analysis = useMemo(() => {
    const totalDays = dayBuckets.length;
    const midpoint = Math.max(1, Math.floor(totalDays / 2));

    const preFollowersDelta = series.length > 1 ? (series[midpoint - 1]?.followers ?? 0) - (series[0]?.followers ?? 0) : 0;
    const postFollowersDelta = series.length > midpoint ? (series[totalDays - 1]?.followers ?? 0) - (series[midpoint]?.followers ?? 0) : 0;
    const preUsersDelta = series.length > 1 ? (series[midpoint - 1]?.users ?? 0) - (series[0]?.users ?? 0) : 0;
    const postUsersDelta = series.length > midpoint ? (series[totalDays - 1]?.users ?? 0) - (series[midpoint]?.users ?? 0) : 0;
    const preInteractions = series.slice(0, midpoint).reduce((sum, row) => sum + row.interactions, 0);
    const postInteractions = series.slice(midpoint).reduce((sum, row) => sum + row.interactions, 0);

    const visibilityPct = percentChange(preFollowersDelta, postFollowersDelta);
    const interactionsPct = percentChange(preInteractions, postInteractions);

    const visibilityMeets = visibilityPct !== null && visibilityPct >= HYPOTHESIS_THRESHOLD;
    const interactionsMeets = interactionsPct !== null && interactionsPct >= HYPOTHESIS_THRESHOLD;
    const hypothesisPass = visibilityMeets && interactionsMeets;

    const visibilityReadable = formatReadableChange(visibilityPct);
    const interactionsReadable = formatReadableChange(interactionsPct);
    const visibilityMultiplier = toMultiplierFromPct(visibilityPct);
    const interactionsMultiplier = toMultiplierFromPct(interactionsPct);

    const comparisonChartData = [
      { metric: 'Usuarios', pre: preUsersDelta, post: postUsersDelta },
      { metric: 'Visibilidad', pre: preFollowersDelta, post: postFollowersDelta },
      { metric: 'Interacción', pre: preInteractions, post: postInteractions },
    ];

    const growthChartData = [
      {
        metric: 'Visibilidad (x)',
        value: visibilityMultiplier ?? 0,
        threshold: 1 + (HYPOTHESIS_THRESHOLD / 100),
        rawPct: visibilityPct ?? 0,
      },
      {
        metric: 'Interacción (x)',
        value: interactionsMultiplier ?? 0,
        threshold: 1 + (HYPOTHESIS_THRESHOLD / 100),
        rawPct: interactionsPct ?? 0,
      },
    ];

    return {
      totalDays,
      preDays: midpoint,
      postDays: Math.max(totalDays - midpoint, 0),
      preFollowersDelta,
      postFollowersDelta,
      preUsersDelta,
      postUsersDelta,
      preInteractions,
      postInteractions,
      visibilityPct,
      interactionsPct,
      visibilityReadable,
      interactionsReadable,
      visibilityMeets,
      interactionsMeets,
      hypothesisPass,
      comparisonChartData,
      growthChartData,
    };
  }, [dayBuckets.length, series]);

  const exportNodeAs = useCallback(async (
    ref: React.RefObject<HTMLDivElement | null>,
    format: 'png' | 'svg',
    fileName: string,
  ) => {
    const node = ref.current;
    if (!node) return;

    try {
      setBusyDownload(`${fileName}.${format}`);
      if (format === 'png') {
        const dataUrl = await toPng(node, {
          pixelRatio: 4,
          cacheBust: true,
          backgroundColor: '#0B1220',
        });
        triggerDownload(`${fileName}.png`, dataUrl);
      } else {
        const dataUrl = await toSvg(node, {
          cacheBust: true,
          backgroundColor: '#0B1220',
        });
        triggerDownload(`${fileName}.svg`, dataUrl);
      }
    } finally {
      setBusyDownload(null);
    }
  }, []);

  const exportSummaryMarkdown = useCallback(() => {
    const now = new Date().toLocaleString('es-MX');
    const lines = [
      '# Evidencia de Hipotesis - Riff',
      '',
      `Generado: ${now}`,
      '',
      '## Resultado principal',
      '',
      `- Veredicto: ${analysis.hypothesisPass ? 'SE CUMPLE' : 'NO SE CUMPLE'}`,
      `- Cambio de visibilidad: ${analysis.visibilityReadable.main} (${formatPct(analysis.visibilityPct)})`,
      `- Cambio de interaccion: ${analysis.interactionsReadable.main} (${formatPct(analysis.interactionsPct)})`,
      `- Umbral de hipotesis: ${HYPOTHESIS_THRESHOLD}%`,
      '',
      '## Datos de referencia (inicio mes anterior a día 15 mes actual)',
      '',
      `- Dias pre: ${analysis.preDays}`,
      `- Dias post: ${analysis.postDays}`,
      `- Visibilidad pre: ${formatNum(analysis.preFollowersDelta)}`,
      `- Visibilidad post: ${formatNum(analysis.postFollowersDelta)}`,
      `- Usuarios pre: ${formatNum(analysis.preUsersDelta)}`,
      `- Usuarios post: ${formatNum(analysis.postUsersDelta)}`,
      `- Interaccion pre: ${formatNum(analysis.preInteractions)}`,
      `- Interaccion post: ${formatNum(analysis.postInteractions)}`,
      '',
      '## Auditoria de calidad de datos',
      '',
      `- Usuarios traidos: ${audit?.usersFetched ?? 0}`,
      `- Usuarios activos: ${audit?.usersActive ?? 0}`,
      `- Usuarios nuevos pre/post: ${audit?.usersCreatedPre ?? 0} / ${audit?.usersCreatedPost ?? 0}`,
      `- Follows traidos: ${audit?.followsFetched ?? 0}`,
      `- Follows usados: ${audit?.followsAfterFilter ?? 0}`,
      `- Follows descartados por inactividad: ${audit?.followsDroppedByInactiveUsers ?? 0}`,
      `- Posts traidos: ${audit?.postsFetched ?? 0}`,
      `- Posts usados: ${audit?.postsAfterFilter ?? 0}`,
      `- Reacciones traidas: ${audit?.reactionsFetched ?? 0}`,
      `- Reacciones usadas: ${audit?.reactionsAfterFilter ?? 0}`,
      `- Fuente de reacciones: ${audit?.reactionsSource === 'direct' ? '/posts/reactions' : 'fallback por post'}`,
      '',
      '## Conclusiones (estado actual)',
      '',
      analysis.hypothesisPass
        ? '- Con la evidencia actual, la plataforma muestra incremento suficiente en visibilidad e interaccion respecto al umbral de 15%.'
        : '- Con la evidencia actual, no se confirma cumplimiento simultaneo del umbral de 15% en visibilidad e interaccion.',
      '- El analisis excluye registros soft-delete/inactivos y aplica deduplicacion para reducir ruido.',
      '- Se recomienda repetir esta exportacion periodicamente para documentar tendencia y estabilidad.',
      '',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload('evidencia_hipotesis_riff.md', url);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [analysis, audit]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-riff-bg via-riff-card to-riff-header">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-riff-primary text-xs tracking-[0.2em] uppercase">Vista privada de evidencia exportable</p>
          <h1 className="text-white text-2xl sm:text-3xl font-bold mt-2">Prueba de Hipotesis con Descarga de Graficas</h1>
          <p className="text-white/75 mt-3 leading-relaxed">
            Esta vista genera evidencia visual de alta calidad (PNG y SVG) con leyendas grandes para incluir en PDF,
            y redacta resultados/conclusiones automaticamente con los datos actuales del backend.
          </p>
          {lastUpdated ? (
            <p className="text-white/55 text-sm mt-3">Actualizado: {new Date(lastUpdated).toLocaleString('es-MX')}</p>
          ) : null}
          <div className="mt-4 inline-flex rounded-lg border border-white/15 overflow-hidden">
            <button
              type="button"
              onClick={() => setScopeMode('global')}
              className={`px-4 py-2 text-sm font-semibold ${scopeMode === 'global' ? 'bg-riff-primary text-white' : 'bg-white/5 text-white/75 hover:bg-white/10'}`}
            >
              Global app
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('my')}
              className={`px-4 py-2 text-sm font-semibold ${scopeMode === 'my' ? 'bg-riff-primary text-white' : 'bg-white/5 text-white/75 hover:bg-white/10'}`}
            >
              Mi cuenta
            </button>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/80">
            Cargando datos significativos para hipótesis...
          </section>
        ) : null}

        {error ? (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-amber-200">
            {error}
          </section>
        ) : null}

        {!loading && !error ? (
          <>
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/60 text-xs uppercase tracking-[0.12em]">Cambio Usuarios</p>
                <p className="text-white text-3xl font-bold mt-2">{formatNum(analysis.postUsersDelta - analysis.preUsersDelta)}</p>
                <p className="text-white/55 text-xs mt-1">Pre: {formatNum(analysis.preUsersDelta)} | Post: {formatNum(analysis.postUsersDelta)}</p>
                <p className="text-xs mt-2 text-white/70">Contexto de crecimiento de base de usuarios</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/60 text-xs uppercase tracking-[0.12em]">Cambio Visibilidad</p>
                <p className="text-white text-3xl font-bold mt-2">{analysis.visibilityReadable.main}</p>
                <p className="text-white/55 text-xs mt-1">{analysis.visibilityReadable.detail}</p>
                <p className={`text-xs mt-2 ${analysis.visibilityMeets ? 'text-green-300' : 'text-red-300'}`}>
                  {analysis.visibilityMeets ? 'Cumple umbral 15%' : 'No cumple umbral 15%'}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/60 text-xs uppercase tracking-[0.12em]">Cambio Interacción</p>
                <p className="text-white text-3xl font-bold mt-2">{analysis.interactionsReadable.main}</p>
                <p className="text-white/55 text-xs mt-1">{analysis.interactionsReadable.detail}</p>
                <p className={`text-xs mt-2 ${analysis.interactionsMeets ? 'text-green-300' : 'text-red-300'}`}>
                  {analysis.interactionsMeets ? 'Cumple umbral 15%' : 'No cumple umbral 15%'}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/60 text-xs uppercase tracking-[0.12em]">Veredicto</p>
                <p className={`text-3xl font-bold mt-2 ${analysis.hypothesisPass ? 'text-green-300' : 'text-red-300'}`}>
                  {analysis.hypothesisPass ? 'SE CUMPLE' : 'NO SE CUMPLE'}
                </p>
                <p className="text-white/60 text-xs mt-2">Regla: visibilidad e interacción deben crecer al menos 15%</p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-white text-xl font-bold">Resultados redactados (hasta el momento)</h2>
              <p className="text-white/80 mt-3 leading-relaxed text-base">
                En el periodo analizado (inicio del mes anterior al día 15 del mes actual), la visibilidad presenta un cambio de {analysis.visibilityReadable.main}
                {' '}({formatPct(analysis.visibilityPct)}) y la interacción un cambio de {analysis.interactionsReadable.main}
                {' '}({formatPct(analysis.interactionsPct)}). Con base en el umbral del 15%, el veredicto actual es
                {' '}{analysis.hypothesisPass ? 'SE CUMPLE' : 'NO SE CUMPLE'}.
              </p>
              <p className="text-white/80 mt-3 leading-relaxed text-base">
                Los resultados se estiman con datos globales de la plataforma, excluyendo registros soft-delete,
                cuentas inactivas y posibles duplicados, con el fin de preservar evidencia significativa para comprobación de hipótesis.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={exportSummaryMarkdown}
                  className="rounded-lg bg-riff-primary hover:bg-riff-secondary text-white px-4 py-2 text-sm font-semibold"
                >
                  Descargar resultados y conclusiones (.md)
                </button>
              </div>
            </section>

            <section
              ref={trendChartRef}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-riff-card to-riff-header p-5"
            >
              <h3 className="text-white text-2xl font-bold">Tendencia diaria global (seguidores e interacción)</h3>
              <p className="text-white/70 text-base mt-2">Leyenda en tamaño grande para lectura en PDF.</p>
              <div className="mt-4">
                <SafeResponsiveChart>
                  <LineChart data={series} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334" opacity={0.35} />
                    <XAxis dataKey="day" stroke="#b7c8df" tick={{ fill: '#dce6f5', fontSize: 14 }} />
                    <YAxis stroke="#b7c8df" tick={{ fill: '#dce6f5', fontSize: 14 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.35)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '15px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 18, color: '#FFFFFF', paddingTop: 8 }} />
                    <Line type="monotone" dataKey="users" name="Usuarios acumulados" stroke="#F5B32D" strokeWidth={4} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="followers" name="Seguidores acumulados" stroke="#22A6FF" strokeWidth={4} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="interactions" name="Interacciones por día" stroke="#2FE08A" strokeWidth={4} dot={{ r: 3 }} />
                  </LineChart>
                </SafeResponsiveChart>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => void exportNodeAs(trendChartRef, 'png', 'evidencia_tendencia_diaria')}
                  className="rounded-lg bg-riff-primary hover:bg-riff-secondary text-white px-4 py-2 text-sm font-semibold"
                  disabled={busyDownload !== null}
                >
                  Descargar PNG alta calidad
                </button>
                <button
                  type="button"
                  onClick={() => void exportNodeAs(trendChartRef, 'svg', 'evidencia_tendencia_diaria')}
                  className="rounded-lg bg-riff-registro hover:brightness-110 text-white px-4 py-2 text-sm font-semibold"
                  disabled={busyDownload !== null}
                >
                  Descargar SVG
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div
                ref={comparisonChartRef}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-riff-card to-riff-header p-5"
              >
                <h3 className="text-white text-xl font-bold">Comparativa Pre vs Post</h3>
                <p className="text-white/70 text-base mt-2">Valores absolutos para visibilidad e interacción.</p>
                <div className="mt-4">
                  <SafeResponsiveChart>
                    <BarChart data={analysis.comparisonChartData} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334" opacity={0.35} />
                      <XAxis dataKey="metric" stroke="#b7c8df" tick={{ fill: '#dce6f5', fontSize: 14 }} />
                      <YAxis stroke="#b7c8df" tick={{ fill: '#dce6f5', fontSize: 14 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          border: '1px solid rgba(148, 163, 184, 0.35)',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '15px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 18, color: '#FFFFFF', paddingTop: 8 }} />
                      <Bar dataKey="pre" name="Pre" fill="#2B78D4" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="post" name="Post" fill="#16B884" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </SafeResponsiveChart>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => void exportNodeAs(comparisonChartRef, 'png', 'evidencia_pre_post')}
                    className="rounded-lg bg-riff-primary hover:bg-riff-secondary text-white px-4 py-2 text-sm font-semibold"
                    disabled={busyDownload !== null}
                  >
                    PNG alta calidad
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportNodeAs(comparisonChartRef, 'svg', 'evidencia_pre_post')}
                    className="rounded-lg bg-riff-registro hover:brightness-110 text-white px-4 py-2 text-sm font-semibold"
                    disabled={busyDownload !== null}
                  >
                    SVG
                  </button>
                </div>
              </div>

              <div
                ref={growthChartRef}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-riff-card to-riff-header p-5"
              >
                <h3 className="text-white text-xl font-bold">Crecimiento relativo (x) vs Umbral</h3>
                <p className="text-white/70 text-base mt-2">Representación compacta para evitar porcentajes visualmente gigantes.</p>
                <div className="mt-4">
                  <SafeResponsiveChart>
                    <BarChart data={analysis.growthChartData} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334" opacity={0.35} />
                      <XAxis dataKey="metric" stroke="#b7c8df" tick={{ fill: '#dce6f5', fontSize: 14 }} />
                      <YAxis stroke="#b7c8df" tick={{ fill: '#dce6f5', fontSize: 14 }} />
                      <Tooltip
                        formatter={(value, name, payload) => {
                          const source = payload?.payload as { rawPct?: number } | undefined;
                          if (name === 'value') {
                            const times = typeof value === 'number' ? `${value.toFixed(2)}x` : String(value);
                            const raw = typeof source?.rawPct === 'number' ? ` (${source.rawPct.toFixed(1)}%)` : '';
                            return [`${times}${raw}`, 'Crecimiento'];
                          }
                          if (name === 'threshold') {
                            return [`${Number(value).toFixed(2)}x (15%)`, 'Umbral'];
                          }
                          return [String(value), String(name)];
                        }}
                        contentStyle={{
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          border: '1px solid rgba(148, 163, 184, 0.35)',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '15px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 18, color: '#FFFFFF', paddingTop: 8 }} />
                      <Bar dataKey="value" name="Crecimiento" fill="#00A6FB" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="threshold" name="Umbral" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </SafeResponsiveChart>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => void exportNodeAs(growthChartRef, 'png', 'evidencia_crecimiento_relativo')}
                    className="rounded-lg bg-riff-primary hover:bg-riff-secondary text-white px-4 py-2 text-sm font-semibold"
                    disabled={busyDownload !== null}
                  >
                    PNG alta calidad
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportNodeAs(growthChartRef, 'svg', 'evidencia_crecimiento_relativo')}
                    className="rounded-lg bg-riff-registro hover:brightness-110 text-white px-4 py-2 text-sm font-semibold"
                    disabled={busyDownload !== null}
                  >
                    SVG
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white text-xl font-bold">Auditoría de datos significativos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base mt-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-white/80 leading-7">
                  <p>Modo de alcance: <span className="text-white font-semibold">{audit?.scopeMode === 'my' ? 'Mi cuenta' : 'Global app'}</span></p>
                  <p>Usuarios traídos: <span className="text-white font-semibold">{audit?.usersFetched ?? 0}</span></p>
                  <p>Usuarios activos detectados: <span className="text-white font-semibold">{audit?.usersActive ?? 0}</span></p>
                  <p>Usuarios nuevos pre/post: <span className="text-white font-semibold">{audit?.usersCreatedPre ?? 0} / {audit?.usersCreatedPost ?? 0}</span></p>
                  <p>Follows traídos: <span className="text-white font-semibold">{audit?.followsFetched ?? 0}</span></p>
                  <p>Follows usados: <span className="text-white font-semibold">{audit?.followsAfterFilter ?? 0}</span></p>
                  <p>Follows descartados por inactividad: <span className="text-white font-semibold">{audit?.followsDroppedByInactiveUsers ?? 0}</span></p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-white/80 leading-7">
                  <p>Posts traídos: <span className="text-white font-semibold">{audit?.postsFetched ?? 0}</span></p>
                  <p>Posts usados: <span className="text-white font-semibold">{audit?.postsAfterFilter ?? 0}</span></p>
                  <p>Reacciones traídas: <span className="text-white font-semibold">{audit?.reactionsFetched ?? 0}</span></p>
                  <p>Reacciones usadas: <span className="text-white font-semibold">{audit?.reactionsAfterFilter ?? 0}</span></p>
                  <p>Interacciones pre/post: <span className="text-white font-semibold">{audit?.reactionsPre ?? 0} / {audit?.reactionsPost ?? 0}</span></p>
                  <p>Fuente de reacciones: <span className="text-white font-semibold">{audit?.reactionsSource === 'direct' ? '/posts/reactions' : 'fallback por post'}</span></p>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {busyDownload ? (
          <section className="rounded-xl border border-riff-primary/40 bg-riff-primary/10 p-3 text-riff-primary text-sm">
            Generando descarga: {busyDownload}
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
