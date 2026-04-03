'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { API_BASE_URL } from '@/app/config/api';
import { getValidToken } from '@/app/utils/jwt';

const ANALYSIS_MONTH_INDEX = 2;
const ANALYSIS_FROM_DAY = 1;
const ANALYSIS_TO_DAY = 30;
const HYPOTHESIS_THRESHOLD = 15;
const MAX_DEFAULT_USERS = 20;

interface WeekBucket {
  label: string;
  start: Date;
  end: Date;
}

interface UserHypothesisRow {
  userId: string;
  usuario: string;
  publicaciones: number;
  likes: number;
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
  const year = now.getFullYear();
  const from = new Date(year, ANALYSIS_MONTH_INDEX, ANALYSIS_FROM_DAY);
  const to = new Date(year, ANALYSIS_MONTH_INDEX, ANALYSIS_TO_DAY);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  return { from: toDayKey(from), to: toDayKey(to) };
}

function buildWeeklyBuckets(fromIso: string, toIso: string): WeekBucket[] {
  const start = new Date(fromIso);
  const end = new Date(toIso);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return Array.from({ length: 4 }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + (index * 7));
    const bucketEnd = index < 3
      ? new Date(bucketStart)
      : new Date(end);
    if (index < 3) {
      bucketEnd.setDate(bucketStart.getDate() + 6);
      bucketEnd.setHours(23, 59, 59, 999);
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

function getUserId(record: Record<string, unknown>): string {
  return String(record.id ?? record._id ?? record.userId ?? record.sql_user_id ?? '');
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
  return String(record.sql_user_id ?? record.authorId ?? record.userId ?? '');
}

function getEventOwnerId(record: Record<string, unknown>): string {
  return String(record.sql_user_id ?? record.organizerId ?? record.userId ?? '');
}

function getFollowedId(record: Record<string, unknown>): string {
  return String(record.followedId ?? record.followingId ?? '');
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
  if (pre <= 0) return null;
  return ((post - pre) / pre) * 100;
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

export default function HypothesisPerUserView() {
  const [rows, setRows] = useState<UserHypothesisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxUsers, setMaxUsers] = useState(MAX_DEFAULT_USERS);
  const [lastUpdated, setLastUpdated] = useState('');

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
      const [usersResult, postsResult, followsResult, reactionsResult, eventsResult] = await Promise.all([
        fetchJson('/users?limit=5000&offset=0', token)
          .catch(() => fetchJson('/users/artists?limit=5000&offset=0', token)),
        fetchJson('/posts', token).catch(() => []),
        fetchJson('/follows?page=1&limit=5000', token).catch(() => fetchJson('/follows', token)),
        fetchJson('/posts/reactions', token).catch(() => []),
        fetchJson('/events?limit=5000&offset=0', token).catch(() => fetchJson('/events', token)).catch(() => []),
      ]);

      const users = dedupeById(toRecordArray(usersResult), 'user')
        .filter((record) => isActiveUserRecord(record))
        .slice(0, Math.max(1, maxUsers));

      const posts = dedupeById(toRecordArray(postsResult), 'post').filter((record) => !isSoftDeletedRecord(record));
      const follows = dedupeById(toRecordArray(followsResult), 'follow').filter((record) => !isSoftDeletedRecord(record));
      const reactions = dedupeById(toRecordArray(reactionsResult), 'reaction').filter((record) => !isSoftDeletedRecord(record));
      const events = dedupeById(toRecordArray(eventsResult), 'event').filter((record) => !isSoftDeletedRecord(record));

      const rangeStart = new Date(from);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(to);
      rangeEnd.setHours(23, 59, 59, 999);

      const computed: UserHypothesisRow[] = users.map((user) => {
        const userId = getUserId(user);
        const usuario = getUserLabel(user);

        const userPosts = posts.filter((post) => {
          const authorId = getAuthorId(post);
          const created = toDate(post.createdAt ?? post.created_at ?? post.date);
          return authorId === userId && isDateInRange(created, rangeStart, rangeEnd);
        });

        const postIdSet = new Set(userPosts.map((post) => extractId(post.id ?? post._id)).filter(Boolean));

        const userReactions = reactions.filter((reaction) => {
          const postId = extractId(reaction.post_id ?? reaction.postId ?? reaction.post ?? reaction.publicationId);
          const created = toDate(reaction.createdAt ?? reaction.created_at ?? reaction.date);
          return postIdSet.has(postId) && isDateInRange(created, rangeStart, rangeEnd);
        });

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

        let likes = 0;
        let guardados = 0;

        userReactions.forEach((reaction) => {
          const type = normalizeReactionType(reaction);
          const weekIndex = findWeekIndex(toDate(reaction.createdAt ?? reaction.created_at ?? reaction.date), weekBuckets);
          if (isLikeType(type)) likes += 1;
          if (isSavedType(type)) guardados += 1;
          if (weekIndex >= 0) {
            weeklyInteraction[weekIndex] += 1;
            weeklyScore[weekIndex] += 1;
          }
        });

        userEvents.forEach((event) => {
          const weekIndex = findWeekIndex(toDate(event.createdAt ?? event.created_at ?? event.date ?? event.startDate), weekBuckets);
          if (weekIndex >= 0) {
            weeklyScore[weekIndex] += 1;
          }
        });

        const visibilityPre = weeklyFollowers[0] + weeklyFollowers[1];
        const visibilityPost = weeklyFollowers[2] + weeklyFollowers[3];
        const interactionPre = weeklyInteraction[0] + weeklyInteraction[1];
        const interactionPost = weeklyInteraction[2] + weeklyInteraction[3];

        const visibilityPct = percentChange(visibilityPre, visibilityPost);
        const interactionPct = percentChange(interactionPre, interactionPost);

        const cumple =
          visibilityPct !== null && visibilityPct >= HYPOTHESIS_THRESHOLD &&
          interactionPct !== null && interactionPct >= HYPOTHESIS_THRESHOLD;

        const semana1 = 'Base';
        const semana2 = formatPct(percentChange(weeklyScore[0], weeklyScore[1]));
        const semana3 = formatPct(percentChange(weeklyScore[1], weeklyScore[2]));
        const semana4 = formatPct(percentChange(weeklyScore[2], weeklyScore[3]));

        return {
          userId,
          usuario,
          publicaciones: userPosts.length,
          likes,
          guardados,
          seguidores: userFollows.length,
          eventos: userEvents.length,
          semana1,
          semana2,
          semana3,
          semana4,
          visibilityPct,
          interactionPct,
          cumple,
        };
      });

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

  const resumen = useMemo(() => {
    const cumplen = rows.filter((row) => row.cumple).length;
    return {
      total: rows.length,
      cumplen,
      noCumplen: Math.max(rows.length - cumplen, 0),
    };
  }, [rows]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-riff-bg via-riff-card to-riff-header">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-riff-primary text-xs tracking-[0.2em] uppercase">Vista privada por usuario</p>
          <h1 className="text-white text-2xl sm:text-3xl font-bold mt-2">Hipótesis por usuario: cumple o no cumple</h1>
          <p className="text-white/75 mt-3 leading-relaxed">
            Periodo analizado: del {new Date(from).toLocaleDateString('es-MX')} al {new Date(to).toLocaleDateString('es-MX')}.
            Se calcula por usuario con métricas de publicaciones, likes, guardados, seguidores y eventos.
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
            <table className="min-w-[1200px] w-full text-sm">
              <thead>
                <tr className="text-left text-cyan-100 border-b border-white/20">
                  <th className="py-3 px-3">Usuario</th>
                  <th className="py-3 px-3">Publicaciones</th>
                  <th className="py-3 px-3">Likes</th>
                  <th className="py-3 px-3">Guardados</th>
                  <th className="py-3 px-3">Seguidores</th>
                  <th className="py-3 px-3">Eventos</th>
                  <th className="py-3 px-3">Semana 1</th>
                  <th className="py-3 px-3">Semana 2</th>
                  <th className="py-3 px-3">Semana 3</th>
                  <th className="py-3 px-3">Semana 4</th>
                  <th className="py-3 px-3">Visibilidad</th>
                  <th className="py-3 px-3">Interacción</th>
                  <th className="py-3 px-3">Hipótesis</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId} className="border-b border-white/10 text-white/90">
                    <td className="py-2 px-3 font-semibold">{row.usuario}</td>
                    <td className="py-2 px-3">{row.publicaciones}</td>
                    <td className="py-2 px-3">{row.likes}</td>
                    <td className="py-2 px-3">{row.guardados}</td>
                    <td className="py-2 px-3">{row.seguidores}</td>
                    <td className="py-2 px-3">{row.eventos}</td>
                    <td className="py-2 px-3">{row.semana1}</td>
                    <td className="py-2 px-3">{row.semana2}</td>
                    <td className="py-2 px-3">{row.semana3}</td>
                    <td className="py-2 px-3">{row.semana4}</td>
                    <td className="py-2 px-3">{formatPct(row.visibilityPct)}</td>
                    <td className="py-2 px-3">{formatPct(row.interactionPct)}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.cumple ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {row.cumple ? 'Cumple' : 'No cumple'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
