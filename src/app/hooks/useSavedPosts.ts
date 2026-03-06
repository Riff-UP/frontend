'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

type MongoIdLike = string | { $oid?: string } | null | undefined;

type SavedPostApi = {
  _id?: MongoIdLike;
  id?: MongoIdLike;
  post_id?: MongoIdLike;
  postId?: MongoIdLike;
  sql_user_id?: string;
  userId?: string;
  saved_at?: string;
  createdAt?: string;
  post?: SavedPost['post'];
};

// Helper para extraer el ID de MongoDB (puede venir como string o como {$oid: "..."})
function extractId(id: MongoIdLike): string {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && id.$oid) return id.$oid;
  return String(id);
}

// Helper para normalizar un SavedPost del backend
function normalizeSavedPost(post: SavedPostApi): SavedPost {
  return {
    id: extractId(post._id || post.id),
    postId: extractId(post.post_id || post.postId),
    userId: post.sql_user_id || post.userId || '',
    createdAt: post.saved_at || post.createdAt,
    post: post.post,
  };
}

export interface SavedPost {
  id: string;
  postId: string;
  userId: string;
  createdAt?: string;
  // Información del post relacionado (puede venir populated desde el backend)
  post?: {
    id: string;
    authorId: string;
    content: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio';
    likesCount?: number;
    commentsCount?: number;
    createdAt?: string;
  };
}

interface UseSavedPostsReturn {
  savedPosts: SavedPost[];
  loading: boolean;
  error: string | null;
  savePost: (postId: string, userId: string) => Promise<SavedPost | null>;
  unsavePost: (savedPostId: string) => Promise<boolean>;
  isPostSaved: (postId: string) => boolean;
  refreshSavedPosts: () => Promise<void>;
}

export function useSavedPosts(userId?: string): UseSavedPostsReturn {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const fetchSavedPosts = useCallback(async () => {
    // No hacer fetch si no hay userId
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Enviar userId como query param para que el backend filtre correctamente
      const url = `${API_URL}/posts/saved?userId=${userId}`;

      const res = await fetch(url, { headers });

      if (!res.ok) {
        setSavedPosts([]);
        setError(null);
        return;
      }

      const data = await res.json();

      const postsArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      const normalizedPosts = postsArray.map(normalizeSavedPost);
      setSavedPosts(normalizedPosts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      // No dejar que el error rompa toda la aplicación
      setSavedPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const savePost = async (postId: string, userId: string): Promise<SavedPost | null> => {
    const token = getToken();

    if (!token) {
      setError('No hay sesión activa');
      return null;
    }

    try {
      setError(null);

      // El backend espera postId y userId (sin guiones bajos)
      const payload = {
        postId: postId,
        userId: userId,
      };

      const res = await fetch(`${API_URL}/posts/saved`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));

        // Si el error es 409 (Conflict), el post ya está guardado
        if (res.status === 409) {
          // Buscar en la lista actual del estado
          const existing = savedPosts.find(sp => sp.postId === postId);
          if (existing) return existing;

          // Si no está en el estado, hacer GET para sincronizar
          try {
            const getRes = await fetch(`${API_URL}/posts/saved?userId=${userId}`, {
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            if (getRes.ok) {
              const allSaved = await getRes.json();
              const savedArray: SavedPostApi[] = Array.isArray(allSaved) ? allSaved : (allSaved?.data || []);
              const found = savedArray.find((sp) =>
                extractId(sp.post_id || sp.postId) === postId
              );
              if (found) {
                const normalized = normalizeSavedPost(found);
                setSavedPosts(prev =>
                  prev.some(p => p.id === normalized.id) ? prev : [...prev, normalized]
                );
                return normalized;
              }
            }
          } catch {
          }
          return null;
        }

        setError(errorData.message || `Error ${res.status}: ${res.statusText}`);
        return null;
      }

      const savedPost = await res.json();

      const normalizedPost = normalizeSavedPost(savedPost);
      setSavedPosts(prev => [...prev, normalizedPost]);

      return normalizedPost;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar post';
      setError(errorMessage);
      return null;
    }
  };

  const unsavePost = async (savedPostId: string): Promise<boolean> => {
    const token = getToken();

    if (!token) {
      setError('No hay sesión activa');
      return false;
    }

    try {
      setError(null);

      const res = await fetch(`${API_URL}/posts/saved/${savedPostId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));

        // Si es 404, el post ya no existe en el backend (o nunca existió)
        // Eliminarlo del estado local de todas formas
        if (res.status === 404) {
          setSavedPosts(prev => prev.filter(sp => sp.id !== savedPostId));
          return true; // Considerarlo exitoso ya que el objetivo era eliminarlo
        }

        setError(errorData.message || 'Error al eliminar post guardado');
        return false;
      }

      // Eliminar del estado local
      setSavedPosts(prev => prev.filter(sp => sp.id !== savedPostId));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar post guardado');
      return false;
    }
  };

  const isPostSaved = (postId: string): boolean => {
    return savedPosts.some(sp => sp.postId === postId);
  };

  useEffect(() => {
    if (userId) {
      fetchSavedPosts();
    }
  }, [fetchSavedPosts, userId]);

  return {
    savedPosts,
    loading,
    error,
    savePost,
    unsavePost,
    isPostSaved,
    refreshSavedPosts: fetchSavedPosts,
  };
}
