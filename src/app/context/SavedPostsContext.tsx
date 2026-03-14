'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

export interface SavedPostContent {
  id?: string;
  _id?: string;
  authorId?: string;
  sql_user_id?: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  likesCount?: number;
  commentsCount?: number;
  createdAt?: string;
  title?: string;
  type?: string;
  description?: string;
}

export interface SavedPost {
  id: string;       // savedPostId del backend (el _id del documento savedPost)
  postId: string;   // el _id del post
  userId: string;
  createdAt?: string;
  post?: SavedPostContent;
}

type MongoId = string | { $oid: string } | unknown;

function extractId(id: MongoId): string {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && '$oid' in (id as object)) {
    return String((id as { $oid: string }).$oid);
  }
  return String(id);
}

// Normaliza la respuesta del GET /posts/saved
// El backend devuelve: { savedPostId, post: { _id, content, mediaUrl, ... } }
// O también puede devolver: { _id, post_id, sql_user_id, saved_at, post: {...} }
function normalizeSavedPost(raw: Record<string, unknown>): SavedPost {
  const rawPost = (raw.post ?? raw.postData ?? raw.publication) as Record<string, unknown> | undefined;
  const rawPostAsId = typeof raw.post === 'string' ? raw.post : undefined;

  // El campo "savedPostId" es el identificador del documento savedPost
  // Puede venir como savedPostId, _id, id
  const rawId = raw.savedPostId ?? raw._id ?? raw.id ?? raw.savedId;
  // El campo del post puede venir como post_id, postId, o dentro del objeto post como _id
  const rawPostId = raw.post_id ?? raw.postId ?? raw.postID
    ?? (rawPost ? (rawPost._id ?? rawPost.id) : undefined)
    ?? rawPostAsId;

  const resolvedId = extractId(rawId) || extractId(raw.saved_post_id ?? raw.savedPostID);
  const resolvedPostId = extractId(rawPostId);

  const postContent = rawPost ? String(rawPost.content ?? rawPost.description ?? rawPost.text ?? '') : '';
  const isContentUrl = postContent.startsWith('http') || postContent.startsWith('/');
  const mediaUrl = rawPost
    ? String(rawPost.mediaUrl ?? rawPost.media_url ?? rawPost.imageUrl ?? (isContentUrl ? postContent : '') ?? '')
    : '';
  const textContent = rawPost
    ? String(rawPost.title ?? rawPost.description ?? (!isContentUrl ? postContent : '') ?? '')
    : '';

  return {
    id: resolvedId,
    postId: resolvedPostId,
    userId: String(raw.sql_user_id ?? raw.userId ?? raw.user_id ?? ''),
    createdAt: String(raw.saved_at ?? raw.createdAt ?? raw.created_at ?? ''),
    post: rawPost ? {
      id: extractId(rawPost._id ?? rawPost.id),
      authorId: String(rawPost.sql_user_id ?? rawPost.authorId ?? rawPost.author_id ?? ''),
      content: textContent,
      mediaUrl: mediaUrl || undefined,
      mediaType: (rawPost.type ?? rawPost.mediaType) as 'image' | 'video' | 'audio' | undefined,
      likesCount: Number(rawPost.likesCount ?? rawPost.likes_count ?? 0),
      commentsCount: Number(rawPost.commentsCount ?? rawPost.comments_count ?? 0),
      createdAt: String(rawPost.createdAt ?? rawPost.created_at ?? ''),
      title: rawPost.title as string | undefined,
      type: (rawPost.type ?? rawPost.mediaType) as string | undefined,
      description: rawPost.description as string | undefined,
    } : undefined,
  };
}

interface SavedPostsContextValue {
  savedPosts: SavedPost[];
  loading: boolean;
  savePost: (postId: string, userId: string) => Promise<SavedPost | null>;
  unsavePost: (savedPostId: string) => Promise<boolean>;
  isPostSaved: (postId: string) => boolean;
  refreshSavedPosts: () => Promise<void>;
}

const SavedPostsContext = createContext<SavedPostsContextValue | null>(null);

function getToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('token');
  return null;
}

export function SavedPostsProvider({ userId, children }: { userId?: string; children: ReactNode }) {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSavedPosts = useCallback(async () => {
    if (!userId) {
      setSavedPosts([]);
      return;
    }
    const token = getToken();
    if (!token) return;

    try {
      setLoading(true);
      // El backend tiene la ruta GET /posts/saved/user/:sqlUserId
      // que devuelve los posts guardados del usuario populados con el post
      const res = await fetch(`${API_URL}/posts/saved?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        // No limpiar el estado en caso de error para preservar actualizaciones optimistas
        return;
      }

      const data = await res.json();
      const postsArray: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray((data as { savedPosts?: Record<string, unknown>[] })?.savedPosts)
        ? (data as { savedPosts: Record<string, unknown>[] }).savedPosts
        : [];

      const normalized = postsArray.map(normalizeSavedPost);
      setSavedPosts(normalized);
    } catch {
      setSavedPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSavedPosts();
  }, [fetchSavedPosts]);

  const savePost = async (postId: string, userId: string): Promise<SavedPost | null> => {
    const token = getToken();
    if (!token) return null;
    if (!postId || postId === 'undefined' || postId === 'null') return null;
    if (!userId || userId === 'undefined' || userId === 'null') return null;

    try {
      const payloads: Record<string, string>[] = [
        { postId, userId },
        { post_id: postId, sql_user_id: userId },
        { postId, userId, post_id: postId, sql_user_id: userId, user_id: userId },
      ];

      let res: Response | null = null;

      for (const payload of payloads) {
        const attempt = await fetch(`${API_URL}/posts/saved`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        res = attempt;

        // Si hay conflicto, ya existe guardado; si fue exitoso, parar.
        if (attempt.status === 409 || attempt.ok) break;

        // Reintentar solo para errores típicos de validación de payload.
        if (attempt.status !== 400 && attempt.status !== 415 && attempt.status !== 422) break;
      }

      if (!res) return null;

      if (res.status === 409) {
        // Ya guardado — buscar en estado actual o refrescar
        const existing = savedPosts.find(sp => String(sp.postId) === String(postId));
        if (existing) return existing;
        // Refrescar y retornar nulo (el estado se actualizará y isPostSaved devolverá true)
        await fetchSavedPosts();
        return null;
      }

      if (!res.ok) {
        await res.json().catch(() => ({}));
        return null;
      }

      // El POST devuelve: { _id, post_id, sql_user_id, saved_at, __v }
      // (sin el post populado)
      const created = await res.json().catch(() => ({})) as Record<string, unknown>;
      const rawSaved = (created.data ?? created.savedPost ?? created.result ?? created) as Record<string, unknown>;

      // Normalizar la respuesta básica
      const basicNormalized = normalizeSavedPost(rawSaved);

      // Agregar al estado inmediatamente
      setSavedPosts(prev => {
        // Evitar duplicados
        if (prev.some(sp => String(sp.postId) === String(postId))) return prev;
        return [...prev, basicNormalized];
      });

      return basicNormalized;
    } catch {
      return null;
    }
  };

  const unsavePost = async (savedPostId: string): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;

    if (!savedPostId || savedPostId === 'undefined' || savedPostId === '') {
      return false;
    }

    // Optimistic update: quitar del estado local inmediatamente
    setSavedPosts(prev => prev.filter(sp => sp.id !== savedPostId));

    try {
      const res = await fetch(`${API_URL}/posts/saved/${savedPostId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok && res.status !== 404) {
        await res.json().catch(() => ({}));
        // Revertir: refrescar desde el backend
        await fetchSavedPosts();
        return false;
      }

      return true;
    } catch {
      await fetchSavedPosts();
      return false;
    }
  };

  const isPostSaved = (postId: string): boolean => {
    return savedPosts.some(sp => String(sp.postId) === String(postId));
  };

  return (
    <SavedPostsContext.Provider value={{
      savedPosts,
      loading,
      savePost,
      unsavePost,
      isPostSaved,
      refreshSavedPosts: fetchSavedPosts,
    }}>
      {children}
    </SavedPostsContext.Provider>
  );
}

export function useSavedPostsContext(): SavedPostsContextValue {
  const ctx = useContext(SavedPostsContext);
  if (!ctx) throw new Error('useSavedPostsContext debe usarse dentro de SavedPostsProvider');
  return ctx;
}
