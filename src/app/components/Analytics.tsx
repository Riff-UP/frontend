'use client';

import { useEffect, useMemo, useState } from 'react';
import FollowerGrowthChart from './analytics/FollowerGrowthChart';
import InteractionsChart from './analytics/InteractionsChart';
import EventAttendanceChart from './analytics/EventAttendanceChart';
import EventRatingChart from './analytics/EventRatingChart';
import { API_BASE_URL } from '@/app/config/api';
import { getUserFromToken, getValidToken } from '@/app/utils/jwt';
import type { FollowerGrowthData, InteractionData, EventAttendanceData, EventRatingData } from '@/app/types';

const WEEK_COUNT = 4;

interface WeekBucket {
  label: string;
  start: Date;
  end: Date;
}

interface FollowRecord {
  followedId?: string;
  followingId?: string;
  createdAt?: string;
  created_at?: string;
}

interface EventRecord {
  _id?: unknown;
  id?: unknown;
  title?: string;
  sql_user_id?: string;
  organizerId?: string;
}

function toRecordArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null);
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [record.data, record.result, record.items, record.rows, record.reactions, record.reviews, record.followers, record.events];

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
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getWeekBuckets(): WeekBucket[] {
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setHours(0, 0, 0, 0);
  const day = currentWeekStart.getDay();
  const diffToMonday = (day + 6) % 7;
  currentWeekStart.setDate(currentWeekStart.getDate() - diffToMonday);

  const buckets: WeekBucket[] = [];

  for (let index = WEEK_COUNT - 1; index >= 0; index -= 1) {
    const start = new Date(currentWeekStart);
    start.setDate(currentWeekStart.getDate() - (index * 7));

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    buckets.push({
      label: `Sem ${WEEK_COUNT - index}`,
      start,
      end,
    });
  }

  return buckets;
}

function findWeekIndex(value: Date | null, buckets: WeekBucket[]): number {
  if (!value) {
    return -1;
  }

  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    if (value >= bucket.start && value < bucket.end) {
      return index;
    }
  }

  return -1;
}

function createEmptyFollowerSeries(buckets: WeekBucket[]): FollowerGrowthData[] {
  return buckets.map((bucket) => ({
    week: bucket.label,
    followers: 0,
    date: bucket.start.toISOString(),
  }));
}

function createEmptyInteractionSeries(buckets: WeekBucket[]): InteractionData[] {
  return buckets.map((bucket) => ({
    week: bucket.label,
    interactions: 0,
    date: bucket.start.toISOString(),
  }));
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

function eventName(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.length > 24 ? `${value.slice(0, 24)}...` : value;
  }

  return fallback;
}

function readNumericMetric(payload: unknown, directKeys: string[]): number | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const nested = [record.data, record.result]
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry));

  for (const key of directKeys) {
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

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followerGrowthData, setFollowerGrowthData] = useState<FollowerGrowthData[]>([]);
  const [interactionData, setInteractionData] = useState<InteractionData[]>([]);
  const [eventAttendanceData, setEventAttendanceData] = useState<EventAttendanceData[]>([]);
  const [eventRatingData, setEventRatingData] = useState<EventRatingData[]>([]);

  const weekBuckets = useMemo(() => getWeekBuckets(), []);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      const token = getValidToken();
      const userFromToken = token ? getUserFromToken(token) : null;
      const userId = userFromToken?.id;

      if (!token || !userId) {
        if (!cancelled) {
          setFollowerGrowthData(createEmptyFollowerSeries(weekBuckets));
          setInteractionData(createEmptyInteractionSeries(weekBuckets));
          setEventAttendanceData([]);
          setEventRatingData([]);
          setError('No se encontró una sesión válida para cargar estadísticas.');
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

        const [followersResult, postsResult, eventsResult] = await Promise.all([
          Promise.any(followerRequests),
          fetchJson(`/posts?userId=${encodeURIComponent(userId)}`, token).catch(() => fetchJson('/posts', token)),
          fetchJson(`/events?userId=${encodeURIComponent(userId)}`, token).catch(() => fetchJson('/events', token)),
        ]);

        const followerRecords = toRecordArray(followersResult) as FollowRecord[];
        const matchingFollowerRecords = followerRecords.filter((record) => {
          const targetId = String(record.followedId ?? record.followingId ?? '');
          return targetId === userId;
        });

        const newFollowersByWeek = weekBuckets.map(() => 0);
        matchingFollowerRecords.forEach((record) => {
          const createdDate = toDate(record.createdAt ?? record.created_at);
          const weekIndex = findWeekIndex(createdDate, weekBuckets);
          if (weekIndex >= 0) {
            newFollowersByWeek[weekIndex] += 1;
          }
        });

        const recentFollowers = newFollowersByWeek.reduce((sum, current) => sum + current, 0);
        const baselineFollowers = Math.max(matchingFollowerRecords.length - recentFollowers, 0);
        let cumulativeFollowers = baselineFollowers;

        const followerSeries: FollowerGrowthData[] = weekBuckets.map((bucket, index) => {
          cumulativeFollowers += newFollowersByWeek[index];
          return {
            week: bucket.label,
            followers: cumulativeFollowers,
            date: bucket.start.toISOString(),
          };
        });

        const posts = toRecordArray(postsResult).filter((post) => {
          const authorId = String(post.sql_user_id ?? post.authorId ?? '');
          return authorId === userId;
        });

        const recentPosts = posts
          .slice(0, 25)
          .map((post) => ({
            ...post,
            postId: extractId(post._id ?? post.id),
            createdAt: post.createdAt ?? post.created_at ?? post.date,
          }))
          .filter((post) => post.postId.length > 0);

        const reactionsResponses = await Promise.allSettled(
          recentPosts.map((post) =>
            fetchJson(`/posts/${encodeURIComponent(post.postId)}/reactions/total`, token)
              .catch(() => fetchJson(`/posts/reactions/post/${encodeURIComponent(post.postId)}`, token))
          )
        );

        const interactionsByWeek = weekBuckets.map(() => 0);

        reactionsResponses.forEach((result, index) => {
          if (result.status !== 'fulfilled') {
            return;
          }

          const totalFromAggregate = readNumericMetric(result.value, ['totalReactions', 'count', 'total']);
          const postDate = toDate(recentPosts[index]?.createdAt);
          const weekIndex = findWeekIndex(postDate, weekBuckets);

          if (typeof totalFromAggregate === 'number' && weekIndex >= 0) {
            interactionsByWeek[weekIndex] += totalFromAggregate;
            return;
          }

          // Fallback legacy: algunos entornos todavia devuelven arreglo de reacciones.
          const legacyCount = toRecordArray(result.value).length;
          if (legacyCount > 0 && weekIndex >= 0) {
            interactionsByWeek[weekIndex] += legacyCount;
          }
        });

        const interactionSeries: InteractionData[] = weekBuckets.map((bucket, index) => ({
          week: bucket.label,
          interactions: interactionsByWeek[index],
          date: bucket.start.toISOString(),
        }));

        const events = toRecordArray(eventsResult)
          .filter((event) => {
            const owner = String(event.sql_user_id ?? event.organizerId ?? '');
            return owner === userId;
          })
          .map((event) => ({
            id: extractId(event._id ?? event.id),
            title: eventName(event.title, 'Evento'),
          }))
          .filter((event) => event.id.length > 0)
          .slice(0, 12);

        const attendanceResults = await Promise.allSettled(
          events.map((event) =>
            fetchJson(`/events/${encodeURIComponent(event.id)}/attendance/total`, token)
              .catch(() => fetchJson(`/events/attendance/event/${encodeURIComponent(event.id)}`, token))
          )
        );

        const ratingResults = await Promise.allSettled(
          events.map((event) =>
            fetchJson(`/events/${encodeURIComponent(event.id)}/rating/average`, token)
              .catch(() => fetchJson(`/events/reviews/event/${encodeURIComponent(event.id)}`, token))
          )
        );

        const attendanceData: EventAttendanceData[] = events.map((event, index) => {
          const response = attendanceResults[index];
          let attendees = 0;

          if (response.status === 'fulfilled') {
            const totalFromAggregate = readNumericMetric(response.value, ['totalAttendees', 'attendees', 'count', 'total']);
            if (typeof totalFromAggregate === 'number') {
              attendees = totalFromAggregate;
            } else {
              attendees = toRecordArray(response.value).filter((entry) => {
                const status = String(entry.status ?? '').toLowerCase();
                return status !== 'cancelled';
              }).length;
            }
          }

          return {
            id: index + 1,
            eventName: event.title,
            attendees,
          };
        });

        const ratingData: EventRatingData[] = events.map((event, index) => {
          const response = ratingResults[index];
          let totalRatings = 0;
          let averageRating = 0;

          if (response.status === 'fulfilled') {
            const averageFromAggregate = readNumericMetric(response.value, ['averageRating', 'avgRating', 'average', 'avg']);
            const totalFromAggregate = readNumericMetric(response.value, ['totalRatings', 'ratingsCount', 'count', 'total']);

            if (typeof averageFromAggregate === 'number') {
              averageRating = averageFromAggregate;
              totalRatings = typeof totalFromAggregate === 'number' ? totalFromAggregate : 0;
            } else {
              const reviews = toRecordArray(response.value);
              const ratingValues = reviews
                .map((entry) => Number(entry.rating ?? entry.score ?? 0))
                .filter((value) => Number.isFinite(value) && value > 0);

              totalRatings = ratingValues.length;
              averageRating = totalRatings > 0
                ? ratingValues.reduce((sum, value) => sum + value, 0) / totalRatings
                : 0;
            }
          }

          return {
            id: index + 1,
            eventName: event.title,
            averageRating,
            totalRatings,
          };
        });

        if (!cancelled) {
          setFollowerGrowthData(followerSeries);
          setInteractionData(interactionSeries);
          setEventAttendanceData(attendanceData);
          setEventRatingData(ratingData);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFollowerGrowthData(createEmptyFollowerSeries(weekBuckets));
          setInteractionData(createEmptyInteractionSeries(weekBuckets));
          setEventAttendanceData([]);
          setEventRatingData([]);
          setError('No fue posible cargar las estadísticas en este momento.');
          setLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [weekBuckets]);

  const totalInteractions = interactionData.reduce((sum, week) => sum + week.interactions, 0);
  const totalFollowerGrowth = followerGrowthData.length > 0 
    ? followerGrowthData[followerGrowthData.length - 1].followers - followerGrowthData[0].followers 
    : 0;
  const growthPercentage = followerGrowthData.length > 0 
    ? (totalFollowerGrowth / followerGrowthData[0].followers * 100).toFixed(1)
    : '0.0';

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-white text-xl sm:text-2xl font-bold">Estadísticas del Mes</h2>
        </div>
        <p className="text-white/80 text-xs sm:text-sm">
          Visualiza el rendimiento de tu perfil en las últimas 4 semanas
        </p>
      </div>

      {loading ? (
        <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/75">
          Cargando estadísticas...
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">
          {error}
        </div>
      ) : null}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-lg p-4 hover:border-riff-primary/30 transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-riff-primary rounded-full group-hover:animate-pulse"></div>
            <p className="text-white/60 text-xs sm:text-sm">Seguidores Totales</p>
          </div>
          <p className="text-white text-xl sm:text-2xl font-bold mb-1">
            {followerGrowthData.length > 0 
              ? followerGrowthData[followerGrowthData.length - 1].followers.toLocaleString()
              : '0'}
          </p>
          <p className="text-green-400 text-xs font-medium">+{growthPercentage}% este mes</p>
        </div>

        <div className="bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-lg p-4 hover:border-riff-secondary/30 transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-riff-secondary rounded-full group-hover:animate-pulse"></div>
            <p className="text-white/60 text-xs sm:text-sm">Interacciones</p>
          </div>
          <p className="text-white text-xl sm:text-2xl font-bold mb-1">
            {totalInteractions.toLocaleString()}
          </p>
          <p className="text-white/60 text-xs">
            {interactionData.length > 0 ? (totalInteractions / interactionData.length).toFixed(0) : '0'} promedio/semana
          </p>
        </div>

        <div className="bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-lg p-4 hover:border-riff-primary-dark/30 transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-riff-primary-dark rounded-full group-hover:animate-pulse"></div>
            <p className="text-white/60 text-xs sm:text-sm">Total Asistentes</p>
          </div>
          <p className="text-white text-xl sm:text-2xl font-bold mb-1">
            {eventAttendanceData.reduce((sum, event) => sum + event.attendees, 0).toLocaleString()}
          </p>
          <p className="text-white/60 text-xs">{eventAttendanceData.length} eventos</p>
        </div>

        <div className="bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-lg p-4 hover:border-riff-registro/30 transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-riff-registro rounded-full group-hover:animate-pulse"></div>
            <p className="text-white/60 text-xs sm:text-sm">Valoración Promedio</p>
          </div>
          <p className="text-white text-xl sm:text-2xl font-bold mb-1">
            {eventRatingData.filter((event) => event.totalRatings > 0).length > 0 
              ? (
                eventRatingData.reduce((sum, event) => sum + (event.averageRating * event.totalRatings), 0)
                / eventRatingData.reduce((sum, event) => sum + event.totalRatings, 0)
              ).toFixed(1)
              : '0.0'} ⭐
          </p>
          <p className="text-white/60 text-xs">
            {eventRatingData.reduce((sum, event) => sum + event.totalRatings, 0)} valoraciones
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follower Growth */}
        <FollowerGrowthChart data={followerGrowthData} />

        {/* Interactions */}
        <InteractionsChart data={interactionData} />

        {/* Event Attendance */}
        <EventAttendanceChart data={eventAttendanceData} />

        {/* Event Ratings */}
        <EventRatingChart data={eventRatingData} />
      </div>
    </div>
  );
}
