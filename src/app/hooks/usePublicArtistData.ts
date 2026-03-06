'use client';

import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../config/api';
import { Publication, Event } from '../types';

const API_URL = API_BASE_URL;

interface RawPost {
  _id?: unknown;
  id?: unknown;
  sql_user_id?: string;
  authorId?: string;
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
  event_date?: string;   // campo correcto del backend
  startDate?: string;    // fallback legacy
  start_date?: string;   // fallback legacy
  endDate?: string;
}

function extractId(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    if ('$oid' in (raw as object)) return String((raw as { $oid: string }).$oid);
    if ('_id' in raw) return extractId((raw as { _id: unknown })._id);
  }
  return String(raw);
}

export function usePublicArtistData(artistId?: string) {
  const [posts, setPosts] = useState<Publication[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [followersCount, setFollowersCount] = useState<number | undefined>(undefined);

  const fetchPosts = useCallback(async () => {
    if (!artistId) return;
    setLoadingPosts(true);
    try {
      // Usar query param para filtrar por artista directamente en el backend
      const res = await fetch(`${API_URL}/posts?userId=${artistId}`, {
        headers: getAuthHeaders(false),
      });
      if (!res.ok) return;
      const data = await res.json();
      const rawArray: RawPost[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data?.posts) ? data.posts : [];

      const artistPosts = rawArray.map(p => {
          const postId = extractId(p._id ?? p.id);
          const imageUrl = p.mediaUrl
            || (p.content && (p.content.startsWith('http') || p.content.startsWith('/'))
              ? p.content : undefined);
          const textContent = p.description
            || (p.content && !p.content.startsWith('http') ? p.content : '')
            || p.title || '';
          const rawDate = p.createdAt || p.created_at;
          return {
            id: postId,
            content: textContent,
            text: textContent,
            image: imageUrl,
            date: rawDate ? new Date(rawDate).toLocaleDateString() : 'Sin fecha',
            time: rawDate ? formatTimeAgo(new Date(rawDate)) : '',
            likes: p.likesCount ?? 0,
            saved: 0,
            isLiked: false,
            isSaved: false,
          } as Publication;
        });

      setPosts(artistPosts);
    } catch {
      // silencioso
    } finally {
      setLoadingPosts(false);
    }
  }, [artistId]);

  const fetchEvents = useCallback(async () => {
    if (!artistId) return;
    setLoadingEvents(true);
    try {
      // Usar query param para filtrar por organizador directamente en el backend
      const res = await fetch(`${API_URL}/events?organizerId=${artistId}`, {
        headers: getAuthHeaders(false),
      });
      if (!res.ok) return;
      const data = await res.json();
      const rawArray: RawEvent[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data) ? data.data : [];

      const artistEvents = rawArray.map(e => {
          const eventId = extractId(e._id ?? e.id);
          const rawDate = e.event_date || e.startDate || e.start_date || '';
          const dateObj = rawDate ? new Date(rawDate) : null;
          return {
            id: eventId,
            title: e.title ?? 'Evento',
            location: e.location ?? '',
            date: dateObj ? dateObj.toISOString().split('T')[0] : '',
            time: dateObj ? dateObj.toTimeString().slice(0, 5) : '',
            description: e.description,
            isAttending: false,
          } as Event;
        });

      setEvents(artistEvents);
    } catch {
      // silencioso
    } finally {
      setLoadingEvents(false);
    }
  }, [artistId]);

  const fetchFollowersCount = useCallback(async () => {
    if (!artistId) return;
    try {
      const res = await fetch(`${API_URL}/follows?followingId=${artistId}`, {
        headers: getAuthHeaders(false),
      });
      if (!res.ok) return;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data?.data ?? []);
      setFollowersCount(arr.length);
    } catch {
      // silencioso
    }
  }, [artistId]);

  useEffect(() => {
    fetchPosts();
    fetchEvents();
    fetchFollowersCount();
  }, [fetchPosts, fetchEvents, fetchFollowersCount]);

  return {
    posts,
    events,
    loadingPosts,
    loadingEvents,
    followersCount,
    refreshPosts: fetchPosts,
    refreshEvents: fetchEvents,
    refreshFollowers: fetchFollowersCount,
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
