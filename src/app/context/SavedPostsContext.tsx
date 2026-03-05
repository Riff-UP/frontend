'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

// Estructura del post populado que devuelve el backend en el GET
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
}

// Estructura que maneja el frontend
export interface SavedPost {
  id: string;       // _id del documento savedPost (string limpio, sin $oid)
  postId: string;   // post_id (el ID del post)
  userId: string;
  createdAt?: string;
  post?: SavedPostContent;  // El post populado (viene del GET /posts/saved)
}

type MongoId = string | { $oid: string } | unknown;

function extractId(id: MongoId): string {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && id !== null && '$oid' in (id as object)) {
    return String((id as { $oid: string }).$oid);
  }
  return String(id);
}

// Normaliza la respuesta del GET /posts/saved
// El backend puede devolver múltiples formatos:
// { _id, post_id, sql_user_id, saved_at, post: {...} }
// { id, postId, userId, createdAt, post: {...} }
// { savedPostId, post: {...} }
function normalizeSavedPost(raw: Record<string, unknown>): SavedPost {
  const rawPost = (raw.post ?? raw.postData ?? raw.publication) as Record<string, unknown> | undefined;

  const rawId = raw._id ?? raw.id ?? raw.savedPostId ?? raw.savedId;
  const rawPostId = raw.post_id ?? raw.postId ?? raw.postID ?? (rawPost ? (rawPost._id ?? rawPost.id) : undefined);

  const resolvedId = extractId(rawId);
  const resolvedPostId = extractId(rawPostId);

  console.log('🔧 normalizeSavedPost:', {
    rawKeys: Object.keys(raw),
    rawId, rawPostId, resolvedId, resolvedPostId,
    hasPost: !!rawPost,
    postKeys: rawPost ? Object.keys(rawPost) : [],
  });

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
      const res = await fetch(`${API_URL}/posts/saved?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        console.warn(`⚠️ GET /posts/saved falló (${res.status})`);
        setSavedPosts([]);
        return;
      }

      const data = await res.json();
      const postsArray: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      // Log RAW para diagnóstico
      if (postsArray.length > 0) {
        console.log('🔍 RAW data completa (primer elemento):');
        console.log('  Keys del elemento:', Object.keys(postsArray[0]));
        console.log('  _id:', postsArray[0]._id, '(type:', typeof postsArray[0]._id, ')');
        console.log('  id:', postsArray[0].id, '(type:', typeof postsArray[0].id, ')');
        console.log('  post_id:', postsArray[0].post_id, '(type:', typeof postsArray[0].post_id, ')');
        console.log('  postId:', postsArray[0].postId, '(type:', typeof postsArray[0].postId, ')');
        console.log('  post keys:', postsArray[0].post ? Object.keys(postsArray[0].post as object) : 'NO POST');
        console.log('  RAW completo:', postsArray[0]);
      }

      const normalized = postsArray.map(normalizeSavedPost);
      console.log('✅ SavedPostsContext - posts cargados:', normalized.length, normalized);
      setSavedPosts(normalized);
    } catch (err) {
      console.error('Error al cargar posts guardados:', err);
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

    try {
      const res = await fetch(`${API_URL}/posts/saved`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userId }),
      });

      if (res.status === 409) {
        // Ya guardado - buscar en estado actual
        const existing = savedPosts.find(sp => sp.postId === postId);
        if (existing) return existing;
        // Si no está en el estado local, refrescar desde el backend
        await fetchSavedPosts();
        return null;
      }

      if (!res.ok) {
        console.error('Error al guardar post:', res.status);
        return null;
      }

      // El POST devuelve solo { _id, post_id, sql_user_id, saved_at }
      // Necesitamos hacer GET para obtener el post populado
      // Pero primero agregamos al estado con la info básica para respuesta inmediata
      const rawSaved = await res.json() as Record<string, unknown>;
      console.log('Post guardado exitosamente:', rawSaved);

      const basicNormalized = normalizeSavedPost(rawSaved);
      // Agregar inmediatamente al estado (sin post populado)
      setSavedPosts(prev => [...prev, basicNormalized]);

      // Luego refrescar para obtener el post populado completo
      await fetchSavedPosts();

      return basicNormalized;
    } catch (err) {
      console.error('Error en savePost:', err);
      return null;
    }
  };

  const unsavePost = async (savedPostId: string): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;

    // Si el savedPostId está vacío, no podemos hacer nada
    if (!savedPostId) {
      console.warn('⚠️ unsavePost: savedPostId vacío, no se puede eliminar');
      return false;
    }

    console.log('🗑️ Eliminando savedPost con id:', savedPostId);

    // Eliminar del estado local INMEDIATAMENTE (optimistic update)
    setSavedPosts(prev => prev.filter(sp => sp.id !== savedPostId));

    try {
      const res = await fetch(`${API_URL}/posts/saved/${savedPostId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok && res.status !== 404) {
        console.error('Error al eliminar post guardado:', res.status);
        // Revertir el estado si falla
        await fetchSavedPosts();
        return false;
      }

      console.log('✅ Post eliminado de guardados exitosamente');
      return true;
    } catch (err) {
      console.error('Error en unsavePost:', err);
      // Revertir el estado si hay error de red
      await fetchSavedPosts();
      return false;
    }
  };

  const isPostSaved = (postId: string): boolean => {
    return savedPosts.some(sp => sp.postId === postId);
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
