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

function extractId(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null) {
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
  const [reactedPosts, setReactedPosts] = useState<Map<string, string>>(new Map());
  const [processingPostId, setProcessingPostId] = useState<string | null>(null);

  const getToken = useCallback((): string | null => {
    if (typeof window !== 'undefined') return localStorage.getItem('token');
    return null;
  }, []);

  // Cargar reacciones previas del usuario al inicializar
  // Nota: GET /posts/reactions puede no soportar filtro por userId — si falla, se ignora silenciosamente
  const fetchUserReactions = useCallback(async () => {
    if (!userId) return;
    const token = getToken();
    if (!token) return;

    try {
      // Intentar con sql_user_id como query param (patrón del backend)
      const res = await fetch(`${API_URL}/posts/reactions?sql_user_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // El endpoint puede no existir o no soportar filtrado — continuar sin reacciones previas
        console.warn('⚠️ GET /posts/reactions no disponible, iniciando sin estado previo');
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
      console.log('✅ Reacciones previas cargadas:', map.size);
    } catch {
      // Silencioso — no bloquear la UI si el endpoint no existe
    }
  }, [userId, getToken]);

  useEffect(() => {
    fetchUserReactions();
  }, [fetchUserReactions]);

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

    setProcessingPostId(postId);

    try {
      // El backend usa siempre POST con toggle: devuelve { reaction: {...}, action: 'created' | 'removed' }
      const payload = { post_id: postId, sql_user_id: userId, type: 'like' };
      console.log('❤️ POST /posts/reactions - Payload:', payload);

      const res = await fetch(`${API_URL}/posts/reactions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('❌ Error en POST /posts/reactions:', res.status, errBody);
        // Revertir optimistic update
        setReactedPosts(prev => {
          const next = new Map(prev);
          if (alreadyLiked && existingReactionId) {
            next.set(postId, existingReactionId);
          } else {
            next.delete(postId);
          }
          return next;
        });
        return { liked: alreadyLiked };
      }

      const raw = await res.json() as Record<string, unknown>;
      console.log('✅ Toggle reaction:', raw);

      // El backend responde: { reaction: {...}, action: 'created' | 'removed' }
      const action = String(raw.action ?? '');
      const reactionData = (raw.reaction ?? raw) as Record<string, unknown>;
      const reactionId = extractId(reactionData._id ?? reactionData.id);

      if (action === 'removed') {
        // El backend quitó la reacción
        setReactedPosts(prev => {
          const next = new Map(prev);
          next.delete(postId);
          return next;
        });
        return { liked: false };
      } else {
        // action === 'created' o cualquier otro caso: se creó la reacción
        setReactedPosts(prev => {
          const next = new Map(prev);
          next.set(postId, reactionId || 'saved');
          return next;
        });
        return { liked: true };
      }

    } catch (err) {
      console.error('❌ Error en toggleLike:', err);
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
      return { liked: alreadyLiked };
    } finally {
      setProcessingPostId(null);
    }
  }, [userId, getToken, reactedPosts, isLiked, processingPostId]);

  return {
    isLiked,
    toggleLike,
    processingPostId,
    reactedPosts,
  };
}
