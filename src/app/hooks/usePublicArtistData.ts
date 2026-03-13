'use client';

import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../config/api';
import { Publication, Event } from '../types';
import { fetchFollowersCount } from '../utils/follows';

const API_URL = API_BASE_URL;

interface RawPost {
  _id?: unknown;
  id?: unknown;
  sql_id?: unknown;
  sql_user_id?: string;
  authorId?: string;
  type?: string;
  title?: string;
  description?: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  likesCount?: number;
  createdAt?: string;
  created_at?: string;
}

interface RawEvent {
  _id?: unknown;
  id?: unknown;
  sql_user_id?: string;
  organizerId?: string;
  title?: string;
  description?: string;
  location?: string;
  event_date?: string;
  startDate?: string;
  start_date?: string;
}

function extractId(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    if ('$oid' in (raw as object)) return String((raw as { $oid: string }).$oid);
    if ('_id' in (raw as object)) return extractId((raw as { _id: unknown })._id);
  }
  return String(raw);
}

function inferMediaTypeFromUrl(url?: string): 'image' | 'video' | 'audio' | undefined {
  if (!url) return undefined;
  const cleanUrl = url.split('?')[0].toLowerCase();

  if (/\.(mp4|m4v|mov|webm|avi)$/i.test(cleanUrl)) return 'video';
  if (/\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(cleanUrl)) return 'audio';
  if (/\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i.test(cleanUrl)) return 'image';

  return undefined;
}

export function usePublicArtistData(artistId?: string) {
  const [posts, setPosts] = useState<Publication[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [followersCount, setFollowersCount] = useState<number | undefined>(undefined);

  const fetchAll = useCallback(async () => {
    if (!artistId) return;

    setLoadingPosts(true);
    setLoadingEvents(true);

    try {
      // cache: 'no-store' para evitar respuestas cacheadas en distintos dispositivos
      const [postsRes, eventsRes] = await Promise.all([
        fetch(`${API_URL}/posts`, { headers: getAuthHeaders(), cache: 'no-store' }),
        fetch(`${API_URL}/events`, { headers: getAuthHeaders(), cache: 'no-store' }),
      ]);

      // ── POSTS ──
      const rawPosts: RawPost[] = postsRes.ok
        ? await postsRes.json().then(d => Array.isArray(d) ? d : d?.data ?? d?.posts ?? [])
        : [];

      const knownIds = new Set<string>([artistId]);
      rawPosts
        .filter(p => String(p.sql_user_id ?? p.authorId ?? '') === artistId)
        .forEach(p => {
          if (p.sql_user_id) knownIds.add(p.sql_user_id);
          if (p.authorId) knownIds.add(p.authorId);
        });

      const artistPosts = rawPosts
        .filter(p => knownIds.has(String(p.sql_user_id ?? p.authorId ?? '')))
        .map(p => {
          const mongoId = extractId(p._id);
          const fallbackId = extractId(p.id);
          const postId = mongoId || (fallbackId.length === 24 ? fallbackId : '');
          if (!postId) return null;
          const normalizedType: 'image' | 'video' | 'audio' | undefined =
            p.type === 'video' || p.mediaType === 'video'
              ? 'video'
              : p.type === 'audio' || p.mediaType === 'audio'
                ? 'audio'
                : p.type === 'image' || p.mediaType === 'image'
                  ? 'image'
                  : inferMediaTypeFromUrl(p.mediaUrl)
                    ?? inferMediaTypeFromUrl(p.content);

          const imageUrl = p.mediaUrl
            || (
              p.content
              && (p.content.startsWith('http') || p.content.startsWith('/'))
              && normalizedType !== 'audio'
                ? p.content
                : undefined
            );
          const textContent = p.description
            || (p.content && !p.content.startsWith('http') ? p.content : '')
            || p.title || '';
          const rawDate = p.createdAt || p.created_at;
          return {
            id: postId,
            type: normalizedType,
            mediaType: normalizedType,
            content: textContent,
            text: textContent,
            image: imageUrl,
            date: rawDate ?? 'Sin fecha',
            time: rawDate ? formatTimeAgo(new Date(rawDate)) : '',
            likes: p.likesCount ?? 0, saved: 0, isLiked: false, isSaved: false,
          } as Publication;
        })
        .filter(Boolean) as Publication[];

      setPosts(artistPosts);
      setLoadingPosts(false);

      // ── EVENTOS ──
      const rawEvents: RawEvent[] = eventsRes.ok
        ? await eventsRes.json().then(d => Array.isArray(d) ? d : d?.data ?? [])
        : [];

      const artistEvents = rawEvents.filter(e =>
        knownIds.has(String(e.sql_user_id ?? e.organizerId ?? ''))
      );

      if (artistEvents.length === 0 && rawEvents.length > 0) {
        try {
          const followsRes = await fetch(`${API_URL}/follows?followingId=${artistId}`, { headers: getAuthHeaders(false), cache: 'no-store' });
          if (followsRes.ok) {
            const followsData = await followsRes.json();
            const follows = Array.isArray(followsData) ? followsData : (followsData?.data ?? []);
            const followsAsFollower = await fetch(`${API_URL}/follows?followerId=${artistId}`, { headers: getAuthHeaders(false), cache: 'no-store' });
            if (followsAsFollower.ok) {
              await followsAsFollower.json();
            }
            void follows;
          }
        } catch { /* silencioso */ }
      }

      const mappedEvents = artistEvents
        .map(e => {
          const eventId = extractId(e._id ?? e.id);
          if (!eventId) return null;
          const rawDate = e.event_date || e.startDate || e.start_date || '';
          // Extraer fecha y hora directamente del string ISO para evitar conversiones de timezone
          // "2025-03-12T11:00:00.000Z" → date="2025-03-12", time="11:00"
          const isoDate = rawDate ? rawDate.substring(0, 10) : '';
          const isoTime = rawDate && rawDate.includes('T') ? rawDate.substring(11, 16) : '';
          return {
            id: eventId,
            title: e.title ?? 'Evento',
            location: e.location ?? '',
            date: isoDate,
            time: isoTime,
            description: e.description,
            isAttending: false,
          } as Event;
        })
        .filter(Boolean) as Event[];

      setEvents(mappedEvents);
    } catch { /* silencioso */ }
    finally {
      setLoadingPosts(false);
      setLoadingEvents(false);
    }
  }, [artistId]);

  const fetchFollowersCountFromApi = useCallback(async () => {
    if (!artistId) return;
    try {
      const totalFollowers = await fetchFollowersCount(artistId);
      if (totalFollowers !== undefined) {
        setFollowersCount(totalFollowers);
      }
    } catch { /* silencioso */ }
  }, [artistId]);

  useEffect(() => {
    fetchAll();
    fetchFollowersCountFromApi();
  }, [fetchAll, fetchFollowersCountFromApi]);

  return {
    posts, events, loadingPosts, loadingEvents, followersCount,
    refreshPosts: fetchAll, refreshEvents: fetchAll, refreshFollowers: fetchFollowersCountFromApi,
  };
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;
  return date.toLocaleDateString();
}