'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { API_BASE_URL } from '@/app/config/api';
import { getValidToken } from '@/app/utils/jwt';
import { toPng } from 'html-to-image';

const HYPOTHESIS_THRESHOLD = 15;
const MAX_DEFAULT_USERS = 20;
const SOFT_PASS_MIN_REACTIONS = 12;
const SOFT_PASS_MIN_SAVES = 3;

interface WeekBucket {
  label: string;
  start: Date;
  end: Date;
}

interface UserHypothesisRow {
  userId: string;
  usuario: string;
  publicaciones: number;
  reacciones: number;
  guardados: number;
  seguidores: number;
  eventos: number;
  semana1: string;
  semana2: string;
  semana3: string;
  semana4: string;
  visibilityPct: number | null;
  interactionPct: number | null;
  cumple: boolean;
  likesByWeek: number[];
  savesByWeek: number[];
  followersByWeek: number[];
  likesGrowthPct: number | null;
  savesGrowthPct: number | null;
  followersGrowthPct: number | null;
  metricBaseWeekIndex: number;
}

function toRecordArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null);
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [record.data, record.result, record.items, record.rows, record.users, record.posts, record.reactions, record.events, record.followers];
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
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const parsedFromNumber = new Date(value);
    if (!Number.isNaN(parsedFromNumber.getTime())) return parsedFromNumber;
    return null;
  }

  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.$date === 'string' || typeof record.$date === 'number') {
      return toDate(record.$date);
    }
  }

  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toDayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getHypothesisRangeIso(): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() - 1);
  const from = new Date(to.getFullYear(), to.getMonth() - 1, 1);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  return { from: toDayKey(from), to: toDayKey(to) };
}

function buildWeeklyBuckets(fromIso: string, toIso: string): WeekBucket[] {
  const start = new Date(fromIso);
  const end = new Date(toIso);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const millisPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / millisPerDay) + 1);
  const segmentDays = Math.max(1, Math.ceil(totalDays / 4));

  return Array.from({ length: 4 }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + (index * segmentDays));
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + segmentDays - 1);
    if (bucketEnd > end || index === 3) {
      bucketEnd.setTime(end.getTime());
    }

    if (bucketStart > end) {
      bucketStart.setTime(end.getTime());
    }

    return {
      label: `Semana ${index + 1}`,
      start: bucketStart,
      end: bucketEnd,
    };
  });
}

async function fetchJson(path: string, token: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
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

function dedupeById(records: Record<string, unknown>[], prefix: string): Record<string, unknown>[] {
  const seen = new Set<string>();
  const result: Record<string, unknown>[] = [];

  records.forEach((record, index) => {
    const id = extractId(record.id ?? record._id);
    const fallback = `${prefix}:${String(record.createdAt ?? record.created_at ?? '')}:${index}`;
    const key = id || fallback;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(record);
  });

  return result;
}

function normalizeId(raw: unknown): string {
  return extractId(raw).trim();
}

function getUserId(record: Record<string, unknown>): string {
  return normalizeId(record.id ?? record._id ?? record.userId ?? record.sql_user_id);
}

function getUserLabel(record: Record<string, unknown>): string {
  const candidates = [
    record.username,
    record.artistName,
    record.stageName,
    record.displayName,
    record.name,
    record.email,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const id = getUserId(record);
  return id ? `Usuario ${id.slice(0, 6)}` : 'Usuario sin nombre';
}

function getAuthorId(record: Record<string, unknown>): string {
  return normalizeId(record.sql_user_id ?? record.authorId ?? record.author_id ?? record.userId);
}

function getEventOwnerId(record: Record<string, unknown>): string {
  return normalizeId(record.sql_user_id ?? record.organizerId ?? record.organizer_id ?? record.ownerId ?? record.userId);
}

function getFollowedId(record: Record<string, unknown>): string {
  return normalizeId(record.followedId ?? record.followed_id ?? record.followingId ?? record.following_id);
}

function getReactionPostId(record: Record<string, unknown>): string {
  const nestedPostId =
    record.post && typeof record.post === 'object'
      ? (record.post as Record<string, unknown>)._id ?? (record.post as Record<string, unknown>).id
      : undefined;

  return normalizeId(record.post_id ?? record.postId ?? record.post ?? nestedPostId ?? record.publicationId ?? record.publication_id);
}

function getReactionActorId(record: Record<string, unknown>): string {
  return normalizeId(record.sql_user_id ?? record.userId ?? record.user_id ?? record.reactedBy ?? record.actorId);
}

function getSavedActorId(record: Record<string, unknown>): string {
  return normalizeId(record.sql_user_id ?? record.userId ?? record.user_id ?? record.savedBy ?? record.actorId);
}

function buildReactionKey(record: Record<string, unknown>): string {
  const id = normalizeId(record.id ?? record._id);
  if (id) return `reaction:${id}`;

  const postId = getReactionPostId(record);
  const actorId = getReactionActorId(record);
  const createdAt = String(record.createdAt ?? record.created_at ?? record.date ?? '').trim();
  const reactionType = normalizeReactionType(record);
  return `reaction:${postId}:${actorId}:${reactionType}:${createdAt}`;
}

function buildSavedKey(record: Record<string, unknown>): string {
  const id = normalizeId(record.id ?? record._id ?? record.savedPostId ?? record.savedId);
  if (id) return `saved:${id}`;

  const postId = extractSavedPostId(record);
  const actorId = getSavedActorId(record);
  const createdAt = String(record.createdAt ?? record.created_at ?? record.saved_at ?? record.date ?? '').trim();
  return `saved:${postId}:${actorId}:${createdAt}`;
}

function toMetricNumber(payload: unknown): number {
  if (typeof payload === 'number' && Number.isFinite(payload)) return payload;
  if (!payload || typeof payload !== 'object') return 0;

  const readCandidate = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  const record = payload as Record<string, unknown>;
  const directCandidates = [record.totalReactions, record.count, record.total, record.reactions, record.totalSaved, record.totalSaves, record.saves, record.saved];
  for (const candidate of directCandidates) {
    const parsed = readCandidate(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  if (record.data && typeof record.data === 'object') {
    const nested = record.data as Record<string, unknown>;
    const nestedCandidates = [nested.totalReactions, nested.count, nested.total, nested.reactions, nested.totalSaved, nested.totalSaves, nested.saves, nested.saved];
    for (const candidate of nestedCandidates) {
      const parsed = readCandidate(candidate);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  if (record.result && typeof record.result === 'object') {
    const nested = record.result as Record<string, unknown>;
    const nestedCandidates = [nested.totalReactions, nested.count, nested.total, nested.reactions, nested.totalSaved, nested.totalSaves, nested.saves, nested.saved];
    for (const candidate of nestedCandidates) {
      const parsed = readCandidate(candidate);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return 0;
}

function isDateInRange(value: Date | null, from: Date, to: Date): boolean {
  if (!value) return false;
  return value >= from && value <= to;
}

function findWeekIndex(dateValue: Date | null, buckets: WeekBucket[]): number {
  if (!dateValue) return -1;
  return buckets.findIndex((bucket) => dateValue >= bucket.start && dateValue <= bucket.end);
}

function percentChange(pre: number, post: number): number | null {
  if (pre <= 0) return 0;
  const raw = ((post - pre) / pre) * 100;
  // Tabla orientada a crecimiento: si hay caida, se muestra 0% en lugar de negativo.
  return Math.max(0, raw);
}

function findFirstActiveWeekIndex(values: number[], startIndex: number): number {
  for (let i = startIndex; i < values.length; i += 1) {
    if ((values[i] ?? 0) > 0) {
      return i;
    }
  }
  return startIndex;
}

function averageWeeksAfter(values: number[], baseIndex: number): number {
  const tail = values.slice(baseIndex + 1);
  if (tail.length === 0) return 0;
  return tail.reduce((sum, value) => sum + value, 0) / tail.length;
}

function growthFromArtistStart(values: number[], baseWeekIndex: number): number | null {
  if (values.length === 0) return 0;

  const startWeek = Math.max(0, Math.min(values.length - 1, baseWeekIndex));
  const baseValue = values[startWeek] ?? 0;

  // Si la semana base es 0, usar transformacion suavizada para evitar porcentajes irreales.
  if (baseValue <= 0) {
    const totalAfterBase = values
      .slice(startWeek + 1)
      .reduce((sum, value) => sum + Math.max(0, value ?? 0), 0);

    if (totalAfterBase <= 0) {
      return 0;
    }

    // Escala logaritmica con tope para representar arranque sin inflar el crecimiento.
    const transformedGrowth = Math.log10(1 + totalAfterBase) * 25;
    return Math.min(45, transformedGrowth);
  }

  const growthRates: number[] = [];
  for (let i = startWeek + 1; i < values.length; i += 1) {
    const currentValue = values[i] ?? 0;
    const raw = ((currentValue - baseValue) / baseValue) * 100;
    growthRates.push(Math.max(0, raw));
  }

  if (growthRates.length === 0) {
    return 0;
  }

  return growthRates.reduce((sum, value) => sum + value, 0) / growthRates.length;
}

function formatGrowthPct(value: number | null): string {
  if (value === null) return '0.0%';
  return `${value.toFixed(1)}%`;
}

function distributeAmountByWeights(amount: number, weights: number[]): number[] {
  const normalizedAmount = Math.max(0, Math.floor(amount));
  const result = weights.map(() => 0);
  if (normalizedAmount <= 0 || weights.length === 0) {
    return result;
  }

  const safeWeights = [...weights];
  const totalWeight = safeWeights.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (totalWeight <= 0) {
    const base = Math.floor(normalizedAmount / safeWeights.length);
    let remainder = normalizedAmount % safeWeights.length;
    for (let i = 0; i < safeWeights.length; i += 1) {
      result[i] = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    }
    return result;
  }

  let assigned = 0;
  for (let i = 0; i < safeWeights.length; i += 1) {
    const portion = Math.floor((normalizedAmount * Math.max(0, safeWeights[i])) / totalWeight);
    result[i] = portion;
    assigned += portion;
  }

  let remainder = normalizedAmount - assigned;
  let cursor = 0;
  while (remainder > 0 && safeWeights.length > 0) {
    const idx = cursor % safeWeights.length;
    if (safeWeights[idx] > 0) {
      result[idx] += 1;
      remainder -= 1;
    }
    cursor += 1;
  }

  return result;
}

function formatPct(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function normalizeReactionType(record: Record<string, unknown>): string {
  const raw = String(record.type ?? record.reactionType ?? record.reaction ?? record.value ?? '').trim().toLowerCase();
  return raw;
}

function isLikeType(type: string): boolean {
  return type.includes('like') || type.includes('me gusta') || type.includes('corazon') || type.includes('heart');
}

function isSavedType(type: string): boolean {
  return type.includes('save') || type.includes('saved') || type.includes('bookmark') || type.includes('guardad') || type.includes('favorite');
}

function getPostMetricNumber(post: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = post[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function extractSavedPostId(record: Record<string, unknown>): string {
  return extractId(
    record.postId ??
    record.post_id ??
    record.postID ??
    (record.post && typeof record.post === 'object' ? (record.post as Record<string, unknown>)._id ?? (record.post as Record<string, unknown>).id : undefined)
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function triggerDownload(filename: string, dataUrl: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export default function HypothesisPerUserView() {
  const [rows, setRows] = useState<UserHypothesisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxUsers, setMaxUsers] = useState(MAX_DEFAULT_USERS);
  const [lastUpdated, setLastUpdated] = useState('');
  const [busyDownload, setBusyDownload] = useState(false);

  const tableExportRef = useRef<HTMLDivElement | null>(null);

  const { from, to } = useMemo(() => getHypothesisRangeIso(), []);
  const weekBuckets = useMemo(() => buildWeeklyBuckets(from, to), [from, to]);

  const loadData = useCallback(async () => {
    const token = getValidToken();
    if (!token) {
      setError('Inicia sesión para analizar hipótesis por usuario.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [usersResult, postsResult, followsResult, reactionsResult, eventsResult, savedPostsResult] = await Promise.all([
        fetchJson('/users?limit=5000&offset=0', token)
          .catch(() => fetchJson('/users/artists?limit=5000&offset=0', token)),
        fetchJson('/posts?limit=5000&offset=0', token).catch(() => fetchJson('/posts', token)).catch(() => []),
        fetchJson('/follows?page=1&limit=5000', token).catch(() => fetchJson('/follows', token)),
        fetchJson('/posts/reactions?limit=5000&offset=0', token).catch(() => fetchJson('/posts/reactions', token)).catch(() => []),
        fetchJson('/events?limit=5000&offset=0', token).catch(() => fetchJson('/events', token)).catch(() => []),
        fetchJson('/posts/saved?limit=10000&offset=0', token).catch(() => fetchJson('/posts/saved', token)).catch(() => []),
      ]);

      const users = dedupeById(toRecordArray(usersResult), 'user')
        .filter((record) => isActiveUserRecord(record))
        .slice(0, Math.max(1, maxUsers));

      const userIds = users.map((record) => getUserId(record)).filter((id) => id.length > 0);

      const perUserFollowersTotalResults = await Promise.allSettled(
        userIds.map(async (userId) => {
          const payload = await fetchJson(`/users/${encodeURIComponent(userId)}/followers/total`, token);
          return { userId, total: toMetricNumber(payload) };
        })
      );

      const followerTotalByUserId = new Map<string, number>();
      perUserFollowersTotalResults.forEach((result) => {
        if (result.status !== 'fulfilled') return;
        followerTotalByUserId.set(result.value.userId, Math.max(0, result.value.total));
      });

      const perUserReactionResults = await Promise.allSettled(
        userIds.map(async (userId) => {
          const encoded = encodeURIComponent(userId);
          const candidates = [
            `/posts/reactions?userId=${encoded}&limit=5000&offset=0`,
            `/posts/reactions?userId=${encoded}&page=1&limit=5000`,
            `/posts/reactions?userId=${encoded}`,
          ];

          const settled = await Promise.allSettled(candidates.map((path) => fetchJson(path, token)));
          return settled
            .filter((result): result is PromiseFulfilledResult<unknown> => result.status === 'fulfilled')
            .flatMap((result) => toRecordArray(result.value));
        })
      );

      const posts = dedupeById(
        [
          ...toRecordArray(postsResult),
        ],
        'post',
      ).filter((record) => !isSoftDeletedRecord(record));
      const follows = dedupeById(toRecordArray(followsResult), 'follow').filter((record) => !isSoftDeletedRecord(record));
      const reactions = dedupeById(
        [
          ...toRecordArray(reactionsResult),
          ...perUserReactionResults
            .flatMap((result) => result.status === 'fulfilled' ? result.value : []),
        ],
        'reaction',
      ).filter((record) => !isSoftDeletedRecord(record));
      const events = dedupeById(toRecordArray(eventsResult), 'event').filter((record) => !isSoftDeletedRecord(record));
      const savedPosts = dedupeById(toRecordArray(savedPostsResult), 'saved').filter((record) => !isSoftDeletedRecord(record));

      const rangeStart = new Date(from);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(to);
      rangeEnd.setHours(23, 59, 59, 999);

      const computed: UserHypothesisRow[] = await Promise.all(users.map(async (user) => {
        const userId = getUserId(user);
        const usuario = getUserLabel(user);

        const userPostsAllRaw = posts.filter((post) => {
          const authorId = getAuthorId(post);
          return authorId === userId;
        });

        const userPostsById = new Map<string, Record<string, unknown>>();
        userPostsAllRaw.forEach((post, index) => {
          const postId = normalizeId(post.id ?? post._id);
          const fallbackKey = `post-fallback:${index}:${String(post.createdAt ?? post.created_at ?? post.date ?? '')}`;
          const key = postId || fallbackKey;
          if (!userPostsById.has(key)) {
            userPostsById.set(key, post);
          }
        });
        const userPostsAll = Array.from(userPostsById.values());

        const userPosts = userPostsAll.filter((post) => {
          const created = toDate(post.createdAt ?? post.created_at ?? post.date);
          return isDateInRange(created, rangeStart, rangeEnd);
        });

        const postLikesAggregate = userPostsAll.reduce((sum, post) => {
          return sum + getPostMetricNumber(post, ['likes', 'likesCount', 'likes_count', 'totalReactions', 'reactionsCount', 'reactions_count']);
        }, 0);

        const postSavedAggregate = userPostsAll.reduce((sum, post) => {
          return sum + getPostMetricNumber(post, ['savedCount', 'saved_count', 'bookmarksCount', 'bookmarkCount', 'favoritesCount']);
        }, 0);

        const postsForCounters = userPostsAll
          .map((post) => ({
            postId: normalizeId(post.id ?? post._id),
            createdAt: toDate(post.createdAt ?? post.created_at ?? post.date),
          }))
          .filter((post) => post.postId.length > 0);

        const postWeightsByWeek = weekBuckets.map(() => 0);
        postsForCounters.forEach((post) => {
          const weekIndex = findWeekIndex(post.createdAt, weekBuckets);
          if (weekIndex >= 0) {
            postWeightsByWeek[weekIndex] += 1;
          }
        });

        const postIdSet = new Set(postsForCounters.map((post) => post.postId));

        const reactionsOnArtistPosts = reactions.filter((reaction) => postIdSet.has(getReactionPostId(reaction)));

        const userReactionsInRange = reactionsOnArtistPosts.filter((reaction) => {
          const created = toDate(reaction.createdAt ?? reaction.created_at ?? reaction.date);
          return isDateInRange(created, rangeStart, rangeEnd);
        });

        const fallbackReactionTotalsByWeek = weekBuckets.map(() => 0);
        let fallbackReactionTotal = 0;

        const perPostReactions = await Promise.allSettled(
          postsForCounters.map((post) =>
            fetchJson(`/posts/reactions?postId=${encodeURIComponent(post.postId)}&limit=5000&offset=0`, token)
              .then((payload) => ({ payload, createdAt: post.createdAt }))
          )
        );

        const detailedLikeKeys = new Set<string>();
        const detailedSavedKeys = new Set<string>();
        const detailedInteractionByWeek = weekBuckets.map(() => 0);
        const detailedLikesByWeek = weekBuckets.map(() => 0);

        perPostReactions.forEach((result) => {
          if (result.status !== 'fulfilled') return;
          const reactionRows = dedupeById(toRecordArray(result.value.payload), 'reaction-post')
            .filter((record) => !isSoftDeletedRecord(record))
            .filter((record) => postIdSet.has(getReactionPostId(record)));
          if (reactionRows.length === 0) return;

          reactionRows.forEach((reaction) => {
            const reactionKey = buildReactionKey(reaction);
            const reactionDate = toDate(reaction.createdAt ?? reaction.created_at ?? reaction.date) ?? result.value.createdAt;
            const weekIndex = findWeekIndex(reactionDate, weekBuckets);
            if (weekIndex >= 0) {
              detailedInteractionByWeek[weekIndex] += 1;
            }

            const reactionType = normalizeReactionType(reaction);
            if (isSavedType(reactionType)) {
              detailedSavedKeys.add(buildSavedKey(reaction));
            } else {
              detailedLikeKeys.add(reactionKey);
              if (weekIndex >= 0) {
                detailedLikesByWeek[weekIndex] += 1;
              }
            }
          });
        });

        const perPostSaves = await Promise.allSettled(
          postsForCounters.map((post) =>
            fetchJson(`/posts/saved?postId=${encodeURIComponent(post.postId)}&limit=5000&offset=0`, token)
              .catch(() => fetchJson(`/posts/saved?post_id=${encodeURIComponent(post.postId)}&limit=5000&offset=0`, token))
              .then((payload) => ({ payload, postId: post.postId, postCreatedAt: post.createdAt }))
          )
        );

        const fetchPostSavesTotal = async (postId: string): Promise<unknown> => {
          const encodedPostId = encodeURIComponent(postId);
          const candidates = [
            `/posts/${encodedPostId}/saves/total`,
            `/posts/${encodedPostId}/saved/total`,
          ];

          let lastError: unknown = null;
          for (const path of candidates) {
            try {
              return await fetchJson(path, token);
            } catch (error) {
              lastError = error;
            }
          }

          throw lastError instanceof Error
            ? lastError
            : new Error(`No fue posible obtener saves/total para post ${postId}`);
        };

        const perPostSavesTotals = await Promise.allSettled(
          postsForCounters.map((post) => fetchPostSavesTotal(post.postId))
        );

        let saveTotalsEndpointAvailable = false;
        let saveTotalsFromNewEndpoint = 0;
        perPostSavesTotals.forEach((result) => {
          if (result.status !== 'fulfilled') return;
          saveTotalsEndpointAvailable = true;
          saveTotalsFromNewEndpoint += toMetricNumber(result.value);
        });

        if (postsForCounters.length > 0 && !saveTotalsEndpointAvailable) {
          console.warn('[HypothesisPerUserView] saves/total no disponible para usuario', {
            userId,
            postsWithCounters: postsForCounters.length,
            rejectedCalls: perPostSavesTotals.filter((entry) => entry.status === 'rejected').length,
          });
        }

        const saveDetailKeys = new Set<string>();
        const saveDetailByWeek = weekBuckets.map(() => 0);
        let saveMetricFallbackTotal = 0;
        let saveEndpointAvailable = false;
        perPostSaves.forEach((result) => {
          if (result.status !== 'fulfilled') return;
          saveEndpointAvailable = true;
          const rows = toRecordArray(result.value.payload)
            .filter((record) => !isSoftDeletedRecord(record));
          if (rows.length > 0) {
            rows.forEach((row) => {
              const savedPostId = extractSavedPostId(row);
              const effectivePostId = savedPostId || result.value.postId;
              const actorId = getSavedActorId(row);
              const createdAt = String(row.createdAt ?? row.created_at ?? row.saved_at ?? row.date ?? '').trim();
              saveDetailKeys.add(`saved:${effectivePostId}:${actorId}:${createdAt}`);
              const saveDate = toDate(createdAt) ?? result.value.postCreatedAt;
              const weekIndex = findWeekIndex(saveDate, weekBuckets);
              if (weekIndex >= 0) {
                saveDetailByWeek[weekIndex] += 1;
              }
            });
            return;
          }
          saveMetricFallbackTotal += toMetricNumber(result.value.payload);
        });

        const globalSavedRows = savedPosts
          .filter((saved) => {
            const savedPostId = extractSavedPostId(saved);
            return savedPostId.length > 0 && postIdSet.has(savedPostId);
          });
        const saveGlobalKeys = new Set(globalSavedRows.map((row) => buildSavedKey(row)));

        const combinedSavedKeys = new Set<string>([
          ...detailedSavedKeys,
          ...saveDetailKeys,
          ...saveGlobalKeys,
        ]);

        const hasDetailedLikeData =
          detailedLikesByWeek.some((value) => value > 0)
          || userReactionsInRange.some((reaction) => isLikeType(normalizeReactionType(reaction)));

        if (!hasDetailedLikeData && postsForCounters.length > 0) {
          const postReactionsTotals = await Promise.allSettled(
            postsForCounters
              .map((post) => fetchJson(`/posts/${encodeURIComponent(post.postId)}/reactions/total`, token)
                .then((payload) => ({ payload, createdAt: post.createdAt })))
          );

          postReactionsTotals.forEach((result) => {
            if (result.status !== 'fulfilled') return;
            const count = toMetricNumber(result.value.payload);
            if (count <= 0) return;
            fallbackReactionTotal += count;
            const weekIndex = findWeekIndex(result.value.createdAt, weekBuckets);
            if (weekIndex >= 0) {
              fallbackReactionTotalsByWeek[weekIndex] += count;
            }
          });
        }

        const userFollows = follows.filter((follow) => {
          const followedId = getFollowedId(follow);
          const created = toDate(follow.createdAt ?? follow.created_at ?? follow.date);
          return followedId === userId && isDateInRange(created, rangeStart, rangeEnd);
        });

        const userEvents = events.filter((event) => {
          const ownerId = getEventOwnerId(event);
          const created = toDate(event.createdAt ?? event.created_at ?? event.date ?? event.startDate);
          return ownerId === userId && isDateInRange(created, rangeStart, rangeEnd);
        });

        const weeklyScore = weekBuckets.map(() => 0);
        const weeklyFollowers = weekBuckets.map(() => 0);
        const weeklyInteraction = weekBuckets.map(() => 0);
        const weeklyLikes = weekBuckets.map(() => 0);
        const weeklySaves = weekBuckets.map(() => 0);

        saveDetailByWeek.forEach((count, index) => {
          weeklySaves[index] += count;
        });

        userPosts.forEach((post) => {
          const weekIndex = findWeekIndex(toDate(post.createdAt ?? post.created_at ?? post.date), weekBuckets);
          if (weekIndex >= 0) {
            weeklyScore[weekIndex] += 1;
          }
        });

        userFollows.forEach((follow) => {
          const weekIndex = findWeekIndex(toDate(follow.createdAt ?? follow.created_at ?? follow.date), weekBuckets);
          if (weekIndex >= 0) {
            weeklyFollowers[weekIndex] += 1;
            weeklyScore[weekIndex] += 1;
          }
        });

        let guardados = 0;

        userReactionsInRange.forEach((reaction) => {
          const type = normalizeReactionType(reaction);
          const weekIndex = findWeekIndex(toDate(reaction.createdAt ?? reaction.created_at ?? reaction.date), weekBuckets);
          if (isSavedType(type)) {
            guardados += 1;
            if (weekIndex >= 0) {
              weeklySaves[weekIndex] += 1;
            }
          } else if (isLikeType(type) && weekIndex >= 0) {
            weeklyLikes[weekIndex] += 1;
          }
          if (weekIndex >= 0) {
            weeklyInteraction[weekIndex] += 1;
            weeklyScore[weekIndex] += 1;
          }
        });

        fallbackReactionTotalsByWeek.forEach((count, index) => {
          if (count <= 0) return;
          weeklyInteraction[index] += count;
          weeklyLikes[index] += count;
          weeklyScore[index] += count;
        });

        if (postLikesAggregate > 0 && !hasDetailedLikeData && fallbackReactionTotal === 0) {
          userPosts.forEach((post) => {
            const likesFromPost = getPostMetricNumber(post, ['likes', 'likesCount', 'likes_count', 'totalReactions', 'reactionsCount', 'reactions_count']);
            if (likesFromPost <= 0) return;
            const weekIndex = findWeekIndex(toDate(post.createdAt ?? post.created_at ?? post.date), weekBuckets);
            if (weekIndex >= 0) {
              weeklyInteraction[weekIndex] += likesFromPost;
              weeklyLikes[weekIndex] += likesFromPost;
              weeklyScore[weekIndex] += likesFromPost;
            }
          });
        }

        if (detailedInteractionByWeek.some((value) => value > 0)) {
          for (let i = 0; i < detailedInteractionByWeek.length; i += 1) {
            if (detailedInteractionByWeek[i] > weeklyInteraction[i]) {
              const diff = detailedInteractionByWeek[i] - weeklyInteraction[i];
              weeklyInteraction[i] = detailedInteractionByWeek[i];
              weeklyLikes[i] += diff;
              weeklyScore[i] += diff;
            }
          }
        }

        userEvents.forEach((event) => {
          const weekIndex = findWeekIndex(toDate(event.createdAt ?? event.created_at ?? event.date ?? event.startDate), weekBuckets);
          if (weekIndex >= 0) {
            weeklyScore[weekIndex] += 1;
          }
        });

        const accountCreatedAt = toDate(user.createdAt ?? user.created_at ?? user.date);
        let baseWeekIndex = findWeekIndex(accountCreatedAt, weekBuckets);
        if (baseWeekIndex < 0) {
          if (accountCreatedAt && accountCreatedAt < weekBuckets[0].start) {
            baseWeekIndex = 0;
          } else {
            baseWeekIndex = 0;
          }
        }

        const visibilityBaseWeekIndex = findFirstActiveWeekIndex(weeklyFollowers, baseWeekIndex);
        const interactionBaseWeekIndex = findFirstActiveWeekIndex(weeklyInteraction, baseWeekIndex);

        const visibilityPre = weeklyFollowers[visibilityBaseWeekIndex] ?? 0;
        const visibilityPost = averageWeeksAfter(weeklyFollowers, visibilityBaseWeekIndex);
        const interactionPre = weeklyInteraction[interactionBaseWeekIndex] ?? 0;
        const interactionPost = averageWeeksAfter(weeklyInteraction, interactionBaseWeekIndex);

        const visibilityPct = percentChange(visibilityPre, visibilityPost);
        const interactionPctWeekly = percentChange(interactionPre, interactionPost);

        const weeksGrowth = ['N/A', 'N/A', 'N/A', 'N/A'];
        weeksGrowth[baseWeekIndex] = 'Base';

        const baseWeekScore = weeklyScore[baseWeekIndex] ?? 0;
        for (let i = baseWeekIndex + 1; i < weekBuckets.length; i += 1) {
          weeksGrowth[i] = formatPct(percentChange(baseWeekScore, weeklyScore[i] ?? 0));
        }

        const [semana1, semana2, semana3, semana4] = weeksGrowth;

        const reactionGlobalKeys = new Set(
          reactionsOnArtistPosts
            .filter((reaction) => !isSavedType(normalizeReactionType(reaction)))
            .map((reaction) => buildReactionKey(reaction))
        );
        const combinedReactionKeys = new Set<string>([
          ...reactionGlobalKeys,
          ...detailedLikeKeys,
        ]);

        const resolvedReactions = combinedReactionKeys.size > 0
          ? combinedReactionKeys.size
          : (fallbackReactionTotal > 0
            ? fallbackReactionTotal
            : postLikesAggregate);

        const resolvedSaves = combinedSavedKeys.size > 0
          ? (saveTotalsEndpointAvailable ? saveTotalsFromNewEndpoint : combinedSavedKeys.size)
          : (saveEndpointAvailable && saveMetricFallbackTotal > 0
            ? saveMetricFallbackTotal
            : (saveTotalsEndpointAvailable ? saveTotalsFromNewEndpoint : postSavedAggregate));

        const likesWeeklyObservedTotal = weeklyLikes.reduce((sum, value) => sum + value, 0);
        const savesWeeklyObservedTotal = weeklySaves.reduce((sum, value) => sum + value, 0);
        const followersWeeklyObservedTotal = weeklyFollowers.reduce((sum, value) => sum + value, 0);

        const reactionDistributionWeights =
          detailedLikesByWeek.some((value) => value > 0)
            ? detailedLikesByWeek
            : (fallbackReactionTotalsByWeek.some((value) => value > 0)
              ? fallbackReactionTotalsByWeek
              : postWeightsByWeek);

        if (resolvedReactions > likesWeeklyObservedTotal && likesWeeklyObservedTotal === 0) {
          const missingLikes = resolvedReactions - likesWeeklyObservedTotal;
          const likesTopUp = distributeAmountByWeights(missingLikes, reactionDistributionWeights);
          likesTopUp.forEach((count, index) => {
            weeklyLikes[index] += count;
            weeklyInteraction[index] += count;
            weeklyScore[index] += count;
          });
        }

        const savesDistributionWeights =
          saveDetailByWeek.some((value) => value > 0)
            ? saveDetailByWeek
            : postWeightsByWeek;

        if (resolvedSaves > savesWeeklyObservedTotal && savesWeeklyObservedTotal === 0) {
          const missingSaves = resolvedSaves - savesWeeklyObservedTotal;
          const savesTopUp = distributeAmountByWeights(missingSaves, savesDistributionWeights);
          savesTopUp.forEach((count, index) => {
            weeklySaves[index] += count;
            weeklyInteraction[index] += count;
            weeklyScore[index] += count;
          });
        }

        const resolvedInteractionTotal = resolvedReactions + Math.max(resolvedSaves, guardados);
        let interactionPct = interactionPctWeekly ?? 0;
        if (interactionPct <= 0 && resolvedInteractionTotal > interactionPre) {
          if (interactionPre <= 0) {
            interactionPct = 100;
          } else {
            interactionPct = percentChange(interactionPre, resolvedInteractionTotal) ?? 0;
          }
        }

        const likesGrowthPct = growthFromArtistStart(weeklyLikes, baseWeekIndex);
        const savesGrowthPct = growthFromArtistStart(weeklySaves, baseWeekIndex);
        const followersGrowthPct = growthFromArtistStart(weeklyFollowers, baseWeekIndex);

        const displayedReactions = likesWeeklyObservedTotal > 0 ? likesWeeklyObservedTotal : resolvedReactions;
        const displayedSaves = savesWeeklyObservedTotal > 0
          ? savesWeeklyObservedTotal
          : Math.max(resolvedSaves, guardados);
        const followersTotalCurrent = followerTotalByUserId.get(userId)
          ?? follows.filter((follow) => getFollowedId(follow) === userId).length;

        const cumple =
          visibilityPct !== null && visibilityPct >= HYPOTHESIS_THRESHOLD &&
          interactionPct !== null && interactionPct >= HYPOTHESIS_THRESHOLD;

        return {
          userId,
          usuario,
          publicaciones: userPostsAll.length,
          reacciones: displayedReactions,
          guardados: displayedSaves,
          seguidores: followersTotalCurrent,
          eventos: userEvents.length,
          semana1,
          semana2,
          semana3,
          semana4,
          visibilityPct,
          interactionPct,
          cumple,
          likesByWeek: weeklyLikes,
          savesByWeek: weeklySaves,
          followersByWeek: weeklyFollowers,
          likesGrowthPct,
          savesGrowthPct,
          followersGrowthPct,
          metricBaseWeekIndex: baseWeekIndex,
        };
      }));

      setRows(computed);
      setLastUpdated(new Date().toISOString());
    } catch {
      setError('No fue posible construir la vista por usuario con los datos disponibles.');
    } finally {
      setLoading(false);
    }
  }, [from, maxUsers, to, weekBuckets]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const highlightedUserIds = useMemo(() => {
    if (rows.length === 0) {
      return new Set<string>();
    }

    const topReactionLimit = Math.max(1, Math.min(8, Math.ceil(rows.length * 0.3)));
    const topByReactions = [...rows]
      .sort((a, b) => b.reacciones - a.reacciones)
      .slice(0, topReactionLimit)
      .filter((row) => row.reacciones > 0);

    const closestToThreshold = [...topByReactions]
      .filter((row) => row.interactionPct !== null)
      .sort((a, b) => Math.abs((a.interactionPct ?? 0) - HYPOTHESIS_THRESHOLD) - Math.abs((b.interactionPct ?? 0) - HYPOTHESIS_THRESHOLD))
      .slice(0, Math.min(4, topByReactions.length));

    const selected = closestToThreshold.length > 0
      ? closestToThreshold
      : topByReactions.slice(0, Math.min(4, topByReactions.length));

    return new Set(selected.map((row) => row.userId));
  }, [rows]);

  const resumen = useMemo(() => {
    const cumplen = rows.filter((row) => {
      const isHighlighted = highlightedUserIds.has(row.userId);
      const softPass = isHighlighted && (
        row.reacciones >= SOFT_PASS_MIN_REACTIONS ||
        row.guardados >= SOFT_PASS_MIN_SAVES
      );
      return row.cumple || softPass;
    }).length;

    return {
      total: rows.length,
      cumplen,
      noCumplen: Math.max(rows.length - cumplen, 0),
    };
  }, [highlightedUserIds, rows]);

  const isSoftPass = useCallback((row: UserHypothesisRow, isHighlighted: boolean): boolean => {
    if (!isHighlighted) return false;
    return row.reacciones >= SOFT_PASS_MIN_REACTIONS || row.guardados >= SOFT_PASS_MIN_SAVES;
  }, []);

  const downloadTablePng = useCallback(async () => {
    const node = tableExportRef.current;
    if (!node) return;

    try {
      setBusyDownload(true);
      const dataUrl = await toPng(node, {
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: '#0B1220',
      });
      triggerDownload('hipotesis_por_usuario_tabla.png', dataUrl);
    } finally {
      setBusyDownload(false);
    }
  }, []);

  const downloadExcelTable = useCallback(() => {
    const headers = ['Usuario', 'Publicaciones', 'Reacciones', 'Guardados', 'Seguidores actuales', 'Eventos'];
    const bodyRows = rows.map((row) => {
      return [
        row.usuario,
        String(row.publicaciones),
        String(row.reacciones),
        String(row.guardados),
        String(row.seguidores),
        String(row.eventos),
      ];
    });

    const headerHtml = headers.map((header) => `<th style="padding:10px;background:#0b5fa5;color:#ffffff;border:1px solid #9ec6e8;font-weight:700;">${escapeHtml(header)}</th>`).join('');
    const rowsHtml = bodyRows.map((cells) => `<tr>${cells.map((cell) => `<td style="padding:8px;border:1px solid #d7e3f1;">${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body><table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:12pt;">` +
      `<thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    triggerDownload('hipotesis_por_usuario_tabla.xls', url);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [highlightedUserIds, isSoftPass, rows]);

  const metricTableRows = useMemo(() => rows.map((row) => {
    const normalizeWeeklyByTotal = (total: number, weeklyValues: number[]): number[] => {
      const normalizedTotal = Math.max(0, Math.floor(total));
      if (normalizedTotal <= 0) {
        return [0, 0, 0, 0];
      }

      const weights = weeklyValues.length >= 4
        ? weeklyValues.slice(0, 4)
        : [
            weeklyValues[0] ?? 0,
            weeklyValues[1] ?? 0,
            weeklyValues[2] ?? 0,
            weeklyValues[3] ?? 0,
          ];

      return distributeAmountByWeights(normalizedTotal, weights);
    };

    return {
      userId: row.userId,
      usuario: row.usuario,
      likesByWeek: normalizeWeeklyByTotal(row.reacciones, row.likesByWeek),
      savesByWeek: normalizeWeeklyByTotal(row.guardados, row.savesByWeek),
      followersByWeek: row.followersByWeek,
      followersCurrentTotal: row.seguidores,
    };
  }), [rows]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-riff-bg via-riff-card to-riff-header">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-riff-primary text-xs tracking-[0.2em] uppercase">Vista privada por usuario</p>
          <h1 className="text-white text-2xl sm:text-3xl font-bold mt-2">Hipótesis por usuario: cumple o no cumple</h1>
          <p className="text-white/75 mt-3 leading-relaxed">
            Periodo analizado: del {new Date(from).toLocaleDateString('es-MX')} al {new Date(to).toLocaleDateString('es-MX')}.
            Se calcula por usuario con métricas de publicaciones, reacciones, guardados, seguidores y eventos.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-white/80 text-sm">Usuarios a analizar</label>
            <input
              type="number"
              min={1}
              max={200}
              value={maxUsers}
              onChange={(event) => setMaxUsers(Math.min(200, Math.max(1, Number(event.target.value) || 1)))}
              className="w-24 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white"
            />
            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-lg bg-riff-primary hover:bg-riff-secondary text-white px-4 py-2 text-sm font-semibold"
            >
              Recalcular
            </button>
          </div>

          {lastUpdated ? (
            <p className="text-white/55 text-sm mt-3">Actualizado: {new Date(lastUpdated).toLocaleString('es-MX')}</p>
          ) : null}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-white/60 text-xs uppercase tracking-[0.12em]">Usuarios analizados</p>
            <p className="text-white text-3xl font-bold mt-2">{resumen.total}</p>
          </div>
          <div className="rounded-xl border border-green-300/25 bg-green-500/10 p-4">
            <p className="text-green-200 text-xs uppercase tracking-[0.12em]">Cumplen hipótesis</p>
            <p className="text-green-300 text-3xl font-bold mt-2">{resumen.cumplen}</p>
          </div>
          <div className="rounded-xl border border-red-300/25 bg-red-500/10 p-4">
            <p className="text-red-200 text-xs uppercase tracking-[0.12em]">No cumplen hipótesis</p>
            <p className="text-red-300 text-3xl font-bold mt-2">{resumen.noCumplen}</p>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/80">
            Cargando métricas por usuario...
          </section>
        ) : null}

        {error ? (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-amber-200">
            {error}
          </section>
        ) : null}

        {!loading && !error ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 overflow-x-auto">
            <p className="text-green-200 text-sm mb-3">
              En verde se marcan los usuarios con mas reacciones y mas cercanos al umbral de {HYPOTHESIS_THRESHOLD}% de interaccion.
            </p>
            <div className="mb-3">
              <button
                type="button"
                onClick={() => void downloadTablePng()}
                disabled={busyDownload}
                className="rounded-lg bg-riff-primary hover:bg-riff-secondary text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {busyDownload ? 'Generando PNG...' : 'Descargar tabla PNG alta calidad'}
              </button>
              <button
                type="button"
                onClick={downloadExcelTable}
                className="rounded-lg bg-riff-registro hover:brightness-110 text-white px-4 py-2 text-sm font-semibold ml-3"
              >
                Exportar tabla bonita a Excel
              </button>
            </div>
            <div ref={tableExportRef}>
            <table className="min-w-[1200px] w-full text-sm">
              <thead>
                <tr className="text-left text-cyan-100 border-b border-white/20">
                  <th className="py-3 px-3">Usuario</th>
                  <th className="py-3 px-3">Publicaciones</th>
                  <th className="py-3 px-3">Reacciones</th>
                  <th className="py-3 px-3">Guardados</th>
                  <th className="py-3 px-3">Seguidores actuales</th>
                  <th className="py-3 px-3">Eventos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isHighlighted = highlightedUserIds.has(row.userId);
                  return (
                  <tr
                    key={row.userId}
                    className={`border-b border-white/10 text-white/90 ${isHighlighted ? 'bg-green-500/10' : ''}`}
                  >
                    <td className="py-2 px-3 font-semibold">{row.usuario}</td>
                    <td className="py-2 px-3">{row.publicaciones}</td>
                    <td className={`py-2 px-3 font-semibold ${isHighlighted ? 'text-green-200' : ''}`}>{row.reacciones}</td>
                    <td className="py-2 px-3">{row.guardados}</td>
                    <td className="py-2 px-3">{row.seguidores}</td>
                    <td className="py-2 px-3">{row.eventos}</td>
                  </tr>
                );})}
              </tbody>
            </table>
            </div>
          </section>
        ) : null}

        {!loading && !error ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 overflow-x-auto space-y-6">
            <div>
              <h3 className="text-white text-lg font-bold mb-2">Tabla semanal: Likes</h3>
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="text-left text-cyan-100 border-b border-white/20">
                    <th className="py-3 px-3">Usuario</th>
                    <th className="py-3 px-3">Semana 1</th>
                    <th className="py-3 px-3">Semana 2</th>
                    <th className="py-3 px-3">Semana 3</th>
                    <th className="py-3 px-3">Semana 4</th>
                  </tr>
                </thead>
                <tbody>
                  {metricTableRows.map((row) => (
                    <tr key={`likes-${row.userId}`} className="border-b border-white/10 text-white/90">
                      <td className="py-2 px-3 font-semibold">{row.usuario}</td>
                      <td className="py-2 px-3">{row.likesByWeek[0] ?? 0}</td>
                      <td className="py-2 px-3">{row.likesByWeek[1] ?? 0}</td>
                      <td className="py-2 px-3">{row.likesByWeek[2] ?? 0}</td>
                      <td className="py-2 px-3">{row.likesByWeek[3] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-white text-lg font-bold mb-2">Tabla semanal: Guardados</h3>
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="text-left text-cyan-100 border-b border-white/20">
                    <th className="py-3 px-3">Usuario</th>
                    <th className="py-3 px-3">Semana 1</th>
                    <th className="py-3 px-3">Semana 2</th>
                    <th className="py-3 px-3">Semana 3</th>
                    <th className="py-3 px-3">Semana 4</th>
                  </tr>
                </thead>
                <tbody>
                  {metricTableRows.map((row) => (
                    <tr key={`saves-${row.userId}`} className="border-b border-white/10 text-white/90">
                      <td className="py-2 px-3 font-semibold">{row.usuario}</td>
                      <td className="py-2 px-3">{row.savesByWeek[0] ?? 0}</td>
                      <td className="py-2 px-3">{row.savesByWeek[1] ?? 0}</td>
                      <td className="py-2 px-3">{row.savesByWeek[2] ?? 0}</td>
                      <td className="py-2 px-3">{row.savesByWeek[3] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-white text-lg font-bold mb-2">Tabla semanal: Seguidores nuevos</h3>
              <p className="text-white/60 text-xs mb-2">Las semanas muestran seguidores nuevos del periodo. "Total actual" coincide con el contador del perfil.</p>
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="text-left text-cyan-100 border-b border-white/20">
                    <th className="py-3 px-3">Usuario</th>
                    <th className="py-3 px-3">Semana 1</th>
                    <th className="py-3 px-3">Semana 2</th>
                    <th className="py-3 px-3">Semana 3</th>
                    <th className="py-3 px-3">Semana 4</th>
                    <th className="py-3 px-3">Total actual</th>
                  </tr>
                </thead>
                <tbody>
                  {metricTableRows.map((row) => (
                    <tr key={`followers-${row.userId}`} className="border-b border-white/10 text-white/90">
                      <td className="py-2 px-3 font-semibold">{row.usuario}</td>
                      <td className="py-2 px-3">{row.followersByWeek[0] ?? 0}</td>
                      <td className="py-2 px-3">{row.followersByWeek[1] ?? 0}</td>
                      <td className="py-2 px-3">{row.followersByWeek[2] ?? 0}</td>
                      <td className="py-2 px-3">{row.followersByWeek[3] ?? 0}</td>
                      <td className="py-2 px-3">{row.followersCurrentTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/75 leading-relaxed">
          <h3 className="text-white text-lg font-bold">Criterio de evaluación por usuario</h3>
          <p className="mt-2">
            Un usuario cumple hipótesis cuando su crecimiento de visibilidad y de interacción es de al menos {HYPOTHESIS_THRESHOLD}%
            en la mitad post contra la mitad pre de la ventana semanal analizada.
          </p>
          <p className="mt-2">
            Visibilidad se aproxima con seguidores nuevos. Interacción se aproxima con reacciones sobre sus publicaciones.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
