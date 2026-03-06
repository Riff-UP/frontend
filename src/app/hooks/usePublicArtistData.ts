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
      // Cargar posts y eventos en paralelo
      const [postsRes, eventsRes] = await Promise.all([
        fetch(`${API_URL}/posts`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/events`, { headers: getAuthHeaders() }),
      ]);

      // ── POSTS ──
      const rawPosts: RawPost[] = postsRes.ok
        ? await postsRes.json().then(d => Array.isArray(d) ? d : d?.data ?? d?.posts ?? [])
        : [];

      // Construir el set de IDs reales del artista:
      // El artistId (de users-ms) SÍ aparece en sql_user_id de posts
      // Todos los sql_user_id de posts de este artista son IDs válidos suyos
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
          const postId = extractId(p._id ?? p.id);
          if (!postId) return null;
          const imageUrl = p.mediaUrl
            || (p.content && (p.content.startsWith('http') || p.content.startsWith('/')) ? p.content : undefined);
          const textContent = p.description
            || (p.content && !p.content.startsWith('http') ? p.content : '')
            || p.title || '';
          const rawDate = p.createdAt || p.created_at;
          return {
            id: postId, content: textContent, text: textContent, image: imageUrl,
            date: rawDate ?? 'Sin fecha',
            time: rawDate ? formatTimeAgo(new Date(rawDate)) : '',
            likes: p.likesCount ?? 0, saved: 0, isLiked: false, isSaved: false,
          } as Publication;
        })
        .filter(Boolean) as Publication[];

      setPosts(artistPosts);
      setLoadingPosts(false);

      // ── EVENTOS ──
      // Si no encontramos el sql_user_id del artista en posts,
      // buscamos en eventos directamente por todos los IDs conocidos
      // Además intentamos inferir más IDs del nombre del artista buscando en follows
      const rawEvents: RawEvent[] = eventsRes.ok
        ? await eventsRes.json().then(d => Array.isArray(d) ? d : d?.data ?? [])
        : [];

      // Si los posts no nos dieron más IDs, los eventos pueden tener el sql_user_id real
      // Buscamos eventos cuyo sql_user_id matchee con CUALQUIER id conocido
      // Si knownIds solo tiene artistId, probamos también matchear por follows
      let artistEvents = rawEvents.filter(e =>
        knownIds.has(String(e.sql_user_id ?? e.organizerId ?? ''))
      );

      // Si no encontramos eventos con los IDs de posts, intentamos una búsqueda
      // por follows: obtenemos los usuarios que siguen a este artista para inferir su ID real
      if (artistEvents.length === 0 && rawEvents.length > 0) {
        console.log('🔄 No se encontraron eventos con IDs de posts, intentando inferir por follows...');
        try {
          const followsRes = await fetch(`${API_URL}/follows?followingId=${artistId}`, { headers: getAuthHeaders(false) });
          if (followsRes.ok) {
            const followsData = await followsRes.json();
            const follows = Array.isArray(followsData) ? followsData : (followsData?.data ?? []);
            // Los follows tienen followerId y followingId, el followingId es el artistId
            // Pero también podemos buscar si el artista sigue a alguien
            const followsAsFollower = await fetch(`${API_URL}/follows?followerId=${artistId}`, { headers: getAuthHeaders(false) });
            if (followsAsFollower.ok) {
              const followerData = await followsAsFollower.json();
              console.log('🔍 Follows del artista:', followerData);
            }
            console.log('🔍 Follows hacia el artista:', follows.length);
          }
        } catch { /* silencioso */ }
      }

      const mappedEvents = artistEvents
        .map(e => {
          const eventId = extractId(e._id ?? e.id);
          if (!eventId) return null;
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
        })
        .filter(Boolean) as Event[];

      setEvents(mappedEvents);
    } catch { /* silencioso */ }
    finally {
      setLoadingPosts(false);
      setLoadingEvents(false);
    }
  }, [artistId]);

  const fetchFollowersCount = useCallback(async () => {
    if (!artistId) return;
    try {
      const res = await fetch(`${API_URL}/follows?followedId=${artistId}`, { headers: getAuthHeaders(false) });
      if (!res.ok) return;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data?.data ?? []);
      setFollowersCount(arr.length);
    } catch { /* silencioso */ }
  }, [artistId]);

  useEffect(() => {
    fetchAll();
    fetchFollowersCount();
  }, [fetchAll, fetchFollowersCount]);

  return {
    posts, events, loadingPosts, loadingEvents, followersCount,
    refreshPosts: fetchAll, refreshEvents: fetchAll, refreshFollowers: fetchFollowersCount,
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
