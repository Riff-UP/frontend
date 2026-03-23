'use client';

import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

interface Reaction {
  id: string;
  postId: string;
  userId: string;
  type: string;
  createdAt?: string;
}

function extractTotalReactions(payload: unknown): number | undefined {
  if (!payload || typeof payload !== 'object') return undefined;

  const record = payload as Record<string, unknown>;
  const direct = record.totalReactions ?? record.count ?? record.total;
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;

  const nestedCandidates = [record.data, record.result];
  for (const candidate of nestedCandidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const nested = candidate as Record<string, unknown>;
    const nestedValue = nested.totalReactions ?? nested.count ?? nested.total;
    if (typeof nestedValue === 'number' && Number.isFinite(nestedValue)) return nestedValue;
  }

  return undefined;
}

function extractId(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    if ('$oid' in raw) return String((raw as { $oid: string }).$oid);
    if ('_id' in raw) return extractId((raw as { _id: unknown })._id);
  }
  return String(raw);
}

function normalizeReaction(raw: Record<string, unknown>): Reaction {
  return {
    id: extractId(raw._id ?? raw.id),
    // El backend devuelve post_id (no postId)
    postId: String(raw.post_id ?? raw.postId ?? ''),
    // El backend devuelve sql_user_id (no userId)
    userId: String(raw.sql_user_id ?? raw.userId ?? ''),
    type: String(raw.type ?? 'like'),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
  };
}

export function usePostReactions(userId?: string) {
  // Empezar con mapa vacío (seguro para SSR)
  const [reactedPosts, setReactedPosts] = useState<Map<string, string>>(new Map());
  const [processingPostId, setProcessingPostId] = useState<string | null>(null);
  // Conteo total de reacciones por post (postId -> count)
  const [postReactionCounts, setPostReactionCounts] = useState<Map<string, number>>(new Map());
  // Flag para saber si ya cargamos la caché local
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const getToken = useCallback((): string | null => {
    if (typeof window !== 'undefined') return localStorage.getItem('token');
    return null;
  }, []);

  // Persistir reacciones en localStorage cuando cambia el mapa
  const persistReactions = useCallback((map: Map<string, string>) => {
    if (typeof window === 'undefined' || !userId) return;
    try {
      const obj: Record<string, string> = {};
      map.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem(`reactions_${userId}`, JSON.stringify(obj));
    } catch { /* ignorar */ }
  }, [userId]);

  // Cargar reacciones previas del usuario al inicializar (desde el backend)
  // El backend acepta ?userId= como query param (ver ENDPOINTS_FALTANTES_HOME_PERFILES.md)
  const fetchUserReactions = useCallback(async () => {
    if (!userId) return;
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/posts/reactions?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return;
      }

      const data = await res.json();
      const arr: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      const map = new Map<string, string>();
      arr.forEach(raw => {
        const r = normalizeReaction(raw);
        if (r.postId && r.id) map.set(r.postId, r.id);
      });
      setReactedPosts(map);
      persistReactions(map);
    } catch {
      // Silencioso — usar caché local
    }
  }, [userId, getToken, persistReactions]);

  useEffect(() => {
    fetchUserReactions();
  }, [fetchUserReactions]);

  // Cargar caché local de reacciones al montar (antes del fetch al backend)
  useEffect(() => {
    if (!userId || cacheLoaded) return;
    try {
      const cached = localStorage.getItem(`reactions_${userId}`);
      if (cached) {
        const obj = JSON.parse(cached) as Record<string, string>;
        const map = new Map(Object.entries(obj));
        if (map.size > 0) {
          setReactedPosts(map);
        }
      }
    } catch { /* ignorar */ }
    setCacheLoaded(true);
  }, [userId, cacheLoaded]);

  // Persistir reacciones automáticamente cuando cambia el mapa
  useEffect(() => {
    if (reactedPosts.size > 0) {
      persistReactions(reactedPosts);
    }
  }, [reactedPosts, persistReactions]);

  /**
   * Obtiene el conteo total de reacciones de uno o varios posts.
    * Llama a GET /posts/:postId/reactions/total por cada postId.
    * Mantiene fallback al endpoint legacy /posts/reactions/post/:postId.
   */
  const fetchPostReactionCounts = useCallback(async (postIds: string[]) => {
    if (!postIds.length) return;
    const token = getToken();
    if (!token) return;

    const results = await Promise.allSettled(
      postIds.map(postId =>
        fetch(`${API_URL}/posts/${postId}/reactions/total`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
          .catch(() =>
            fetch(`${API_URL}/posts/reactions/post/${postId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then(r => (r.ok ? r.json() : Promise.reject(r.status)))
          )
      )
    );

    setPostReactionCounts(prev => {
      const next = new Map(prev);
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          // El backend puede devolver agregados ({ totalReactions }) o arreglo legacy.
          const aggregateCount = extractTotalReactions(data);
          const count = typeof aggregateCount === 'number'
            ? aggregateCount
            : Array.isArray(data)
              ? data.length
              : Array.isArray((data as { data?: unknown[] })?.data)
                ? ((data as { data?: unknown[] }).data?.length ?? 0)
                : 0;
          next.set(postIds[i], count);
        }
      });
      return next;
    });
  }, [getToken]);

  const getReactionCount = useCallback((postId: string): number => {
    return postReactionCounts.get(postId) ?? 0;
  }, [postReactionCounts]);

  const isLiked = useCallback((postId: string): boolean => {
    return reactedPosts.has(postId);
  }, [reactedPosts]);

  const toggleLike = useCallback(async (postId: string): Promise<{ liked: boolean }> => {
    if (!userId || !postId || processingPostId === postId) {
      return { liked: isLiked(postId) };
    }

    const token = getToken();
    if (!token) return { liked: isLiked(postId) };

    const alreadyLiked = reactedPosts.has(postId);
    const existingReactionId = reactedPosts.get(postId);

    // Optimistic update inmediato
    setReactedPosts(prev => {
      const next = new Map(prev);
      if (alreadyLiked) {
        next.delete(postId);
      } else {
        next.set(postId, 'pending');
      }
      return next;
    });

    // Optimistic update del conteo total
    setPostReactionCounts(prev => {
      const next = new Map(prev);
      const current = next.get(postId) ?? 0;
      next.set(postId, alreadyLiked ? Math.max(0, current - 1) : current + 1);
      return next;
    });

    setProcessingPostId(postId);

    try {
      const payload = { post_id: postId, sql_user_id: userId, type: 'like' };

      const res = await fetch(`${API_URL}/posts/reactions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        await res.json().catch(() => ({}));
        // Revertir optimistic updates
        setReactedPosts(prev => {
          const next = new Map(prev);
          if (alreadyLiked && existingReactionId) {
            next.set(postId, existingReactionId);
          } else {
            next.delete(postId);
          }
          return next;
        });
        setPostReactionCounts(prev => {
          const next = new Map(prev);
          const current = next.get(postId) ?? 0;
          next.set(postId, alreadyLiked ? current + 1 : Math.max(0, current - 1));
          return next;
        });
        return { liked: alreadyLiked };
      }

      const raw = await res.json() as Record<string, unknown>;

      const action = String(raw.action ?? '');
      const reactionData = (raw.reaction ?? raw) as Record<string, unknown>;
      const reactionId = extractId(reactionData._id ?? reactionData.id);

      if (action === 'removed') {
        setReactedPosts(prev => {
          const next = new Map(prev);
          next.delete(postId);
          return next;
        });
        // Refrescar conteo real desde el servidor
        fetchPostReactionCounts([postId]);
        return { liked: false };
      } else {
        setReactedPosts(prev => {
          const next = new Map(prev);
          next.set(postId, reactionId || 'saved');
          return next;
        });
        // Refrescar conteo real desde el servidor
        fetchPostReactionCounts([postId]);
        return { liked: true };
      }

    } catch {
      // Revertir
      setReactedPosts(prev => {
        const next = new Map(prev);
        if (alreadyLiked && existingReactionId) {
          next.set(postId, existingReactionId);
        } else {
          next.delete(postId);
        }
        return next;
      });
      setPostReactionCounts(prev => {
        const next = new Map(prev);
        const current = next.get(postId) ?? 0;
        next.set(postId, alreadyLiked ? current + 1 : Math.max(0, current - 1));
        return next;
      });
      return { liked: alreadyLiked };
    } finally {
      setProcessingPostId(null);
    }
  }, [userId, getToken, reactedPosts, isLiked, processingPostId, fetchPostReactionCounts]);

  return {
    isLiked,
    toggleLike,
    processingPostId,
    reactedPosts,
    postReactionCounts,
    fetchPostReactionCounts,
    getReactionCount,
  };
}
