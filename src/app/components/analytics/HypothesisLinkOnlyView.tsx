'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import SafeResponsiveChart from '@/app/components/analytics/SafeResponsiveChart';
import { API_BASE_URL } from '@/app/config/api';
import { getUserFromToken, getValidToken } from '@/app/utils/jwt';
import type { FollowerGrowthData, InteractionData } from '@/app/types';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';

const MAX_ANALYSIS_DAY = 30;
const HYPOTHESIS_THRESHOLD = 15;

interface DayBucket {
  label: string;
  dayKey: string;
}

interface FollowRecord {
  followerId?: string;
  followedId?: string;
  followingId?: string;
  createdAt?: string;
  created_at?: string;
}

interface ReactionRecord {
  createdAt?: string;
  created_at?: string;
}

interface DailyMetricsPayload {
  usersByDay: number[];
  followsByDay: number[];
  usersBaseline: number;
  followsBaseline: number;
  rows: number;
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

function isSoftDeletedRecord(record: Record<string, unknown>): boolean {
  const deletedAt = record.deletedAt ?? record.deleted_at;
  if (typeof deletedAt === 'string' && deletedAt.trim() !== '') {
    return true;
  }
  if (deletedAt instanceof Date) {
    return true;
  }

  const isDeleted = record.isDeleted ?? record.is_deleted;
  if (isDeleted === true || isDeleted === 1 || isDeleted === 'true' || isDeleted === '1') {
    return true;
  }

  const deletedFlag = record.deleted;
  if (deletedFlag === true || deletedFlag === 1 || deletedFlag === 'true' || deletedFlag === '1') {
    return true;
  }

  const statusValue = record.status;
  if (statusValue === false || statusValue === 0 || statusValue === 'false' || statusValue === '0') {
    return true;
  }
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
  if (id) {
    return `${fallbackPrefix}:id:${id}`;
  }

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
    if (seen.has(key)) {
      return;
    }
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
  if (isSoftDeletedRecord(record)) {
    return false;
  }

  const status = record.status;
  if (status === undefined || status === null) {
    return true;
  }

  if (status === true || status === 1 || status === 'true' || status === '1') {
    return true;
  }

  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    return normalized === 'active' || normalized === 'enabled';
  }

  return false;
}

function extractFollowFollowerId(record: FollowRecord): string {
  return String((record as unknown as Record<string, unknown>).followerId ?? '');
}

function extractFollowTargetId(record: FollowRecord): string {
  return String(record.followedId ?? record.followingId ?? '');
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

function getCurrentMonthRangeIso(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month, Math.min(MAX_ANALYSIS_DAY, new Date(year, month + 1, 0).getDate()));
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
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const endDay = Math.min(MAX_ANALYSIS_DAY, lastDayOfMonth);

  const buckets: DayBucket[] = [];
  for (let dayNumber = 1; dayNumber <= endDay; dayNumber += 1) {
    const day = new Date(year, month, dayNumber);
    day.setHours(0, 0, 0, 0);
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

function toMultiplierFromPct(pct: number | null): number | null {
  if (pct === null) return null;
  const multiplier = 1 + (pct / 100);
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    return null;
  }
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
    return {
      main: `${multiplier.toFixed(2)}x`,
      detail: `Equivale a ${pct.toFixed(1)}%`,
    };
  }

  return { main: `${pct.toFixed(1)}%`, detail: 'Cambio porcentual directo' };
}

export default function HypothesisLinkOnlyView() {
  const [scopeMode, setScopeMode] = useState<'global' | 'my'>('global');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followersSeries, setFollowersSeries] = useState<FollowerGrowthData[]>([]);
  const [interactionsSeries, setInteractionsSeries] = useState<InteractionData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [audit, setAudit] = useState<DataAudit | null>(null);

  const dayBuckets = useMemo(() => getDayBuckets(), []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const token = getValidToken();

      if (!token) {
        if (!cancelled) {
          setError('Inicia sesión para consultar datos globales del backend y evaluar la hipótesis.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const currentUserId = getUserFromToken(token)?.id || '';
        const range = getCurrentMonthRangeIso();
        const scopeParam = scopeMode === 'my' ? 'user' : 'global';
        const scopeQuery = scopeMode === 'my' && currentUserId ? `&userId=${encodeURIComponent(currentUserId)}` : '';

        const dailyPayload = await fetchJson(
          `/analytics/hypothesis/daily?from=${range.from}&to=${range.to}&scope=${scopeParam}${scopeQuery}`,
          token,
        ).catch(() => null);
        const dailyMetrics = normalizeDailyMetricsPayload(dailyPayload, dayBuckets);

        const [usersResult, followersResult, postsResult, reactionsResult] = await Promise.all([
          fetchJson('/users?limit=5000&offset=0', token)
            .catch(() => fetchJson('/users/artists?limit=5000&offset=0', token))
            .catch(() => []),
          fetchJson('/follows', token).catch(() => fetchJson('/follows?page=1&limit=5000', token)),
          fetchJson('/posts', token),
          fetchJson('/posts/reactions', token).catch(() => []),
        ]);

        const rawUsers = toRecordArray(usersResult);
        const rawFollowers = toRecordArray(followersResult);
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

        const targetUserIdSet = new Set(targetUserIds);
        const targetUsers = rawUsers.filter((record) => targetUserIdSet.has(extractUserIdFromAny(record)));

        const dedupedFollowers = dedupeRecords(rawFollowers, 'follow');
        const dedupedPosts = dedupeRecords(rawPosts, 'post');
        const dedupedReactions = dedupeRecords(rawReactions, 'reaction');

        const followersWithoutSoftDelete = dedupedFollowers
          .filter((record) => !isSoftDeletedRecord(record)) as FollowRecord[];

        let effectiveFollowers = followersWithoutSoftDelete as FollowRecord[];
        if (scopeMode === 'global' && effectiveFollowers.length < Math.max(targetUserIds.length / 3, 10)) {
          const followChunks = await Promise.allSettled(
            targetUserIds.map((userId) => fetchJson(`/follows?followedId=${encodeURIComponent(userId)}`, token))
          );
          const expanded = followChunks
            .filter((result): result is PromiseFulfilledResult<unknown> => result.status === 'fulfilled')
            .flatMap((result) => toRecordArray(result.value));
          effectiveFollowers = dedupeRecords(expanded, 'follow-expanded')
            .filter((record) => !isSoftDeletedRecord(record)) as FollowRecord[];
        }

        const followerRecords = effectiveFollowers
          .filter((record) => {
            if (activeUserIds.size === 0) {
              return targetUserIdSet.has(extractFollowTargetId(record));
            }

            const followerId = extractFollowFollowerId(record);
            const targetId = extractFollowTargetId(record);

            if (!followerId || !targetId) {
              return false;
            }

            return activeUserIds.has(followerId) && activeUserIds.has(targetId) && targetUserIdSet.has(targetId);
          });

        const followsDroppedByInactiveUsers = Math.max(effectiveFollowers.length - followerRecords.length, 0);

        let posts = dedupedPosts
          .filter((record) => !isSoftDeletedRecord(record))
          .filter((record) => {
            const authorId = String(record.sql_user_id ?? record.authorId ?? record.userId ?? '');
            return targetUserIdSet.has(authorId);
          })
          .map((post) => ({
            ...post,
            postId: extractId(post._id ?? post.id),
            createdAt: post.createdAt ?? post.created_at ?? post.date,
          }));

        if (scopeMode === 'global' && posts.length < Math.max(targetUserIds.length / 4, 8)) {
          const perUserPosts = await Promise.allSettled(
            targetUserIds.map((userId) => fetchJson(`/posts?userId=${encodeURIComponent(userId)}`, token))
          );
          const expandedPosts = perUserPosts
            .filter((result): result is PromiseFulfilledResult<unknown> => result.status === 'fulfilled')
            .flatMap((result) => toRecordArray(result.value));
          posts = dedupeRecords(expandedPosts, 'post-expanded')
            .filter((record) => !isSoftDeletedRecord(record))
            .map((post) => ({
              ...post,
              postId: extractId(post._id ?? post.id),
              createdAt: post.createdAt ?? post.created_at ?? post.date,
            }));
        }

        const reactions = dedupedReactions
          .filter((record) => !isSoftDeletedRecord(record)) as ReactionRecord[];

        let newFollowersByDay = dayBuckets.map(() => 0);
        let usersByDay = dayBuckets.map(() => 0);

        targetUsers.forEach((record) => {
          const createdDate = toDate(record.createdAt ?? record.created_at ?? record.date);
          const dayIndex = findDayIndex(createdDate, dayBuckets);
          if (dayIndex >= 0) {
            usersByDay[dayIndex] += 1;
          }
        });

        followerRecords.forEach((record) => {
          const createdDate = toDate(record.createdAt ?? record.created_at);
          const dayIndex = findDayIndex(createdDate, dayBuckets);
          if (dayIndex >= 0) {
            newFollowersByDay[dayIndex] += 1;
          }
        });

        if (dailyMetrics) {
          usersByDay = dailyMetrics.usersByDay;
          newFollowersByDay = dailyMetrics.followsByDay;
        }

        const followersBaseline = dailyMetrics
          ? dailyMetrics.followsBaseline
          : Math.max(followerRecords.length - newFollowersByDay.reduce((sum, current) => sum + current, 0), 0);

        let cumulativeFollowers = followersBaseline;
        const builtFollowersSeries: FollowerGrowthData[] = dayBuckets.map((bucket, index) => {
          cumulativeFollowers += newFollowersByDay[index];
          return {
            week: bucket.label,
            followers: cumulativeFollowers,
            date: bucket.dayKey,
          };
        });

        const interactionsByDay = dayBuckets.map(() => 0);
        let reactionsSource: 'direct' | 'fallback-by-post' = 'direct';

        if (reactions.length > 0) {
          reactions.forEach((reaction) => {
            const reactionDate = toDate(reaction.createdAt ?? reaction.created_at);
            const dayIndex = findDayIndex(reactionDate, dayBuckets);
            if (dayIndex >= 0) {
              interactionsByDay[dayIndex] += 1;
            }
          });
        } else {
          // Fallback si el endpoint de reacciones no responde: usa agregados por post en su fecha de creacion.
          reactionsSource = 'fallback-by-post';
          const postsWithIds = posts.filter((post) => post.postId.length > 0);
          const reactionsResponses = await Promise.allSettled(
            postsWithIds.map((post) => fetchJson(`/posts/${encodeURIComponent(post.postId)}/reactions/total`, token))
          );

          reactionsResponses.forEach((result, index) => {
            if (result.status !== 'fulfilled') return;

            const postDate = toDate(postsWithIds[index]?.createdAt);
            const dayIndex = findDayIndex(postDate, dayBuckets);
            if (dayIndex < 0) return;

            const totalFromAggregate = readNumericMetric(result.value, ['totalReactions', 'count', 'total']);
            interactionsByDay[dayIndex] += typeof totalFromAggregate === 'number' ? totalFromAggregate : 0;
          });
        }

        const builtInteractionsSeries: InteractionData[] = dayBuckets.map((bucket, index) => ({
          week: bucket.label,
          interactions: interactionsByDay[index],
          date: bucket.dayKey,
        }));

        const midpoint = Math.max(1, Math.floor(dayBuckets.length / 2));
        const followsPre = newFollowersByDay.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
        const followsPost = newFollowersByDay.slice(midpoint).reduce((sum, value) => sum + value, 0);
        const usersCreatedPre = usersByDay.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
        const usersCreatedPost = usersByDay.slice(midpoint).reduce((sum, value) => sum + value, 0);
        const reactionsPre = interactionsByDay.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
        const reactionsPost = interactionsByDay.slice(midpoint).reduce((sum, value) => sum + value, 0);

        if (!cancelled) {
          setFollowersSeries(builtFollowersSeries);
          setInteractionsSeries(builtInteractionsSeries);
          setAudit({
            scopeMode,
            dailyEndpointUsed: dailyMetrics !== null,
            dailyRows: dailyMetrics?.rows ?? 0,
            usersFetched: rawUsers.length,
            usersActive: activeUserIds.size,
            usersCreatedPre,
            usersCreatedPost,
            followsFetched: rawFollowers.length,
            followsAfterFilter: followerRecords.length,
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
          setError('No fue posible consultar datos globales del backend para evaluar la hipótesis.');
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

    const preFollowersDelta = followersSeries.length > 1
      ? followersSeries[midpoint - 1]?.followers - followersSeries[0]?.followers
      : 0;
    const postFollowersDelta = followersSeries.length > midpoint
      ? followersSeries[totalDays - 1]?.followers - followersSeries[midpoint]?.followers
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

    const visibilityReadable = formatReadableChange(visibilityPct);
    const interactionsReadable = formatReadableChange(interactionsPct);
    const visibilityMultiplier = toMultiplierFromPct(visibilityPct);
    const interactionsMultiplier = toMultiplierFromPct(interactionsPct);

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
      visibilityReadable,
      interactionsReadable,
      visibilityMultiplier,
      interactionsMultiplier,
      totalDays,
      preDays: midpoint,
      postDays: Math.max(totalDays - midpoint, 0),
      comparisonChartData: [
        { metric: 'Visibilidad', pre: preFollowersDelta, post: postFollowersDelta },
        { metric: 'Interacción', pre: preInteractions, post: postInteractions },
      ],
      changeChartData: [
        { metric: 'Visibilidad (x)', value: visibilityMultiplier ?? 0, threshold: 1 + (HYPOTHESIS_THRESHOLD / 100), rawPct: visibilityPct ?? 0 },
        { metric: 'Interacción (x)', value: interactionsMultiplier ?? 0, threshold: 1 + (HYPOTHESIS_THRESHOLD / 100), rawPct: interactionsPct ?? 0 },
      ],
    };
  }, [dayBuckets.length, followersSeries, interactionsSeries]);

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
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/60 text-xs uppercase tracking-[0.12em]">Usuarios nuevos</p>
                <p className="text-white text-3xl font-bold mt-2">{(audit?.usersCreatedPost ?? 0) - (audit?.usersCreatedPre ?? 0)}</p>
                <p className="text-white/55 text-xs mt-1">Pre: {audit?.usersCreatedPre ?? 0} | Post: {audit?.usersCreatedPost ?? 0}</p>
                <p className="text-xs mt-2 text-white/70">Contexto de crecimiento de base de usuarios</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/60 text-xs uppercase tracking-[0.12em]">Cambio Visibilidad</p>
                <p className="text-white text-3xl font-bold mt-2">
                  {analysis.visibilityReadable.main}
                </p>
                <p className="text-white/55 text-xs mt-1">{analysis.visibilityReadable.detail}</p>
                <p className={`text-xs mt-2 ${analysis.visibilityMeets ? 'text-green-300' : 'text-red-300'}`}>
                  {analysis.visibilityMeets ? 'Cumple umbral 15%' : 'No cumple umbral 15%'}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/60 text-xs uppercase tracking-[0.12em]">Cambio Interacción</p>
                <p className="text-white text-3xl font-bold mt-2">
                  {analysis.interactionsReadable.main}
                </p>
                <p className="text-white/55 text-xs mt-1">{analysis.interactionsReadable.detail}</p>
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
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-riff-card to-riff-header p-4 sm:p-6">
                <h3 className="text-white text-lg font-bold mb-4">Crecimiento global de seguidores por día</h3>
                <SafeResponsiveChart>
                  <LineChart data={followersSeries} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334" opacity={0.35} />
                    <XAxis dataKey="week" stroke="#9aa" tick={{ fill: '#ccd', fontSize: 12 }} />
                    <YAxis stroke="#9aa" tick={{ fill: '#ccd', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.35)',
                        borderRadius: '10px',
                        color: '#fff',
                      }}
                    />
                    <Line type="monotone" dataKey="followers" stroke="#007BFF" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </SafeResponsiveChart>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-riff-card to-riff-header p-4 sm:p-6">
                <h3 className="text-white text-lg font-bold mb-4">Interacciones globales por día</h3>
                <SafeResponsiveChart>
                  <LineChart data={interactionsSeries} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334" opacity={0.35} />
                    <XAxis dataKey="week" stroke="#9aa" tick={{ fill: '#ccd', fontSize: 12 }} />
                    <YAxis stroke="#9aa" tick={{ fill: '#ccd', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.35)',
                        borderRadius: '10px',
                        color: '#fff',
                      }}
                    />
                    <Line type="monotone" dataKey="interactions" stroke="#2B78D4" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </SafeResponsiveChart>
              </div>
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
                <h3 className="text-white text-lg font-bold mb-4">Crecimiento relativo (x) vs umbral</h3>
                <SafeResponsiveChart>
                  <BarChart data={analysis.changeChartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334" opacity={0.4} />
                    <XAxis dataKey="metric" stroke="#9aa" tick={{ fill: '#ccd', fontSize: 12 }} />
                    <YAxis stroke="#9aa" tick={{ fill: '#ccd', fontSize: 12 }} />
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
                      }}
                    />
                    <Bar dataKey="value" fill="#00A6FB" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="threshold" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </SafeResponsiveChart>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white text-lg font-bold mb-3">Auditoría de datos (origen de métricas)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-white/80">
                  <p>Modo de alcance: <span className="text-white font-semibold">{audit?.scopeMode === 'my' ? 'Mi cuenta' : 'Global app'}</span></p>
                  <p>Daily endpoint usado: <span className="text-white font-semibold">{audit?.dailyEndpointUsed ? 'Sí' : 'No (fallback)'}</span></p>
                  <p>Filas daily recibidas: <span className="text-white font-semibold">{audit?.dailyRows ?? 0}</span></p>
                  <p>Usuarios traídos: <span className="text-white font-semibold">{audit?.usersFetched ?? 0}</span></p>
                  <p>Usuarios activos detectados: <span className="text-white font-semibold">{audit?.usersActive ?? 0}</span></p>
                  <p>Usuarios nuevos pre/post: <span className="text-white font-semibold">{audit?.usersCreatedPre ?? 0} / {audit?.usersCreatedPost ?? 0}</span></p>
                  <p>Follows traídos: <span className="text-white font-semibold">{audit?.followsFetched ?? 0}</span></p>
                  <p>Follows usados (sin soft-delete/inactivos): <span className="text-white font-semibold">{audit?.followsAfterFilter ?? 0}</span></p>
                  <p>Follows descartados por cuentas inactivas: <span className="text-white font-semibold">{audit?.followsDroppedByInactiveUsers ?? 0}</span></p>
                  <p>Follows pre: <span className="text-white font-semibold">{audit?.followsPre ?? 0}</span></p>
                  <p>Follows post: <span className="text-white font-semibold">{audit?.followsPost ?? 0}</span></p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-white/80">
                  <p>Posts traídos: <span className="text-white font-semibold">{audit?.postsFetched ?? 0}</span></p>
                  <p>Posts usados (sin soft-delete/inactivos): <span className="text-white font-semibold">{audit?.postsAfterFilter ?? 0}</span></p>
                  <p>Reacciones traídas: <span className="text-white font-semibold">{audit?.reactionsFetched ?? 0}</span></p>
                  <p>Reacciones usadas: <span className="text-white font-semibold">{audit?.reactionsAfterFilter ?? 0}</span></p>
                  <p>Interacciones pre/post: <span className="text-white font-semibold">{audit?.reactionsPre ?? 0} / {audit?.reactionsPost ?? 0}</span></p>
                  <p>Fuente de reacciones: <span className="text-white font-semibold">{audit?.reactionsSource === 'direct' ? '/posts/reactions' : 'fallback por post'}</span></p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white text-lg font-bold mb-3">Síntesis metodológica</h3>
              <ul className="space-y-2 text-white/80 text-sm list-disc pl-5">
                <li>Se usa el mes actual del día 01 al día 30 con datos globales de toda la plataforma.</li>
                <li>Pre = primera mitad del mes ({analysis.preDays} días) y Post = segunda mitad ({analysis.postDays} días).</li>
                <li>Visibilidad se aproxima con nuevos follows del sistema por periodo.</li>
                <li>Interacción se aproxima con reacciones globales de publicaciones por periodo.</li>
                <li>Se excluyen registros con soft-delete o estado inactivo para evitar ruido de pruebas.</li>
                <li>Se aplica deduplicación por id/combinación de campos para prevenir conteos inflados.</li>
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
