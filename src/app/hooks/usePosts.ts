import { useState } from 'react';
import { validateMediaFile, uploadToR2 } from '../utils/r2Storage';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const API_URL = API_BASE_URL;
const POST_REQUEST_TIMEOUT_MS = 20_000;

function extractId(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (obj.$oid) return String(obj.$oid);
    if (obj._id) return extractId(obj._id);
    if (obj.id) return extractId(obj.id);
  }
  return String(raw);
}

export interface Post {
  id: string;
  authorId?: string;
  sql_user_id?: string;
  title?: string;
  description?: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  type?: string;
  provider?: string;
  provider_meta?: { provider_url?: string };
  tags?: string[];
  likesCount?: number;
  commentsCount?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
}

export interface CreatePostData {
  // ── campos para media posts (imagen/video) ──
  content?: string;
  mediaFile?: File;
  imageFile?: File;
  tags?: string[];
  // ── campos para audio posts ──
  type?: 'image' | 'video' | 'audio';
  title?: string;
  description?: string;
  url?: string;          // URL de la canción (audio posts)
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = POST_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Verifica tu conexión e inténtalo de nuevo.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  const rawText = await response.text();
  if (!rawText) return `Error ${response.status}: ${response.statusText}`;
  try {
    const data = JSON.parse(rawText) as { message?: string; error?: string };
    return data.message || data.error || rawText;
  } catch {
    return rawText;
  }
}

export function usePosts(userId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') return localStorage.getItem('token');
    return null;
  };

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/posts`, { headers });
      if (!response.ok) throw new Error('Error al obtener las publicaciones');

      const data = await response.json();
      const rawArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.posts)
        ? data.posts
        : [];

      const allPosts = rawArray
        .map((p: Record<string, unknown>) => ({ ...p, id: extractId(p._id ?? p.id) }))
        .filter((p: Record<string, unknown>) => p.id && p.id !== 'undefined' && p.id !== 'null' && p.id !== '');

      const postsArray = userId
        ? allPosts.filter((p: Record<string, unknown>) => String(p.sql_user_id ?? p.authorId ?? '') === userId)
        : allPosts;

      setPosts(postsArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (postData: CreatePostData): Promise<Post | null> => {
    if (!userId) { setError('Usuario no autenticado'); return null; }

    setUploading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión para publicar.');

      // ── RAMA AUDIO: siempre JSON, nunca multipart
      if (postData.type === 'audio') {
        const audioUrl = postData.url ?? postData.content ?? '';
        if (!audioUrl) throw new Error('La URL de la canción es requerida');

        const payload = {
          sql_user_id: userId,
          type: 'audio' as const,
          title: postData.title ?? 'Sin título',
          content: audioUrl,
          description: postData.description,
        };

        const response = await fetchWithTimeout(`${API_URL}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(await extractErrorMessage(response));

        const newPost = await response.json();
        const normalized: Post = { ...newPost, id: extractId(newPost._id ?? newPost.id) };
        setPosts(prev => [normalized, ...(Array.isArray(prev) ? prev : [])]);
        return normalized;
      }

      const mediaFile = postData.mediaFile ?? postData.imageFile;

      // ── RAMA TEXTO: permitir publicar sin media ─────────────────────────
      if (!mediaFile) {
        const textValue = (postData.content ?? '').trim();
        if (!textValue) throw new Error('La publicación no puede estar vacía');

        const payload: Record<string, unknown> = {
          sql_user_id: userId,
          type: 'text',
          title: textValue.substring(0, 100) || 'Nueva publicación',
          description: textValue,
          content: textValue,
        };

        if (postData.tags && postData.tags.length > 0) payload.tags = postData.tags;

        let response = await fetchWithTimeout(`${API_URL}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });

        // Fallback por compatibilidad con backends que no reconocen type:text
        if (!response.ok && (response.status === 400 || response.status === 415)) {
          const fallbackPayload: Record<string, unknown> = {
            sql_user_id: userId,
            title: textValue.substring(0, 100) || 'Nueva publicación',
            description: textValue,
            content: textValue,
          };
          if (postData.tags && postData.tags.length > 0) fallbackPayload.tags = postData.tags;

          response = await fetchWithTimeout(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(fallbackPayload),
          });
        }

        if (!response.ok) throw new Error(await extractErrorMessage(response));

        const newPost = await response.json();
        const normalized: Post = { ...newPost, id: extractId(newPost._id ?? newPost.id) };
        setPosts(prev => [normalized, ...(Array.isArray(prev) ? prev : [])]);
        return normalized;
      }

      // ── RAMA MEDIA (imagen/video): multipart → fallback JSON ─────────────
      if (mediaFile) {
        const validation = validateMediaFile(mediaFile);
        if (!validation.valid) throw new Error(validation.error);
      }

      const mediaType: 'image' | 'video' = mediaFile?.type.startsWith('video/') ? 'video' : 'image';

      const titleValue = (postData.content ?? '').substring(0, 100) || 'Nueva publicación';
      const descriptionValue = postData.content || 'Sin descripción';

      const formData = new FormData();
      formData.append('sql_user_id', userId);
      formData.append('type', mediaType);
      formData.append('title', titleValue);
      formData.append('description', descriptionValue);
      if (mediaFile) {
        formData.append('image', mediaFile);
        formData.append('file', mediaFile);
      }
      if (postData.tags && postData.tags.length > 0) formData.append('tags', JSON.stringify(postData.tags));

      let response = await fetchWithTimeout(`${API_URL}/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok && (response.status === 404 || response.status === 415 || response.status === 400)) {
        let mediaUrl: string | undefined;
        if (mediaFile) mediaUrl = await uploadToR2(mediaFile);

        const payload: Record<string, unknown> = {
          sql_user_id: userId,
          type: mediaType,
          title: titleValue,
          description: descriptionValue,
        };
        if (mediaUrl) payload.mediaUrl = mediaUrl;

        response = await fetchWithTimeout(`${API_URL}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(await extractErrorMessage(response));
      }

      if (!response.ok) throw new Error(await extractErrorMessage(response));

      const newPost = await response.json();
      const normalized: Post = { ...newPost, id: extractId(newPost._id ?? newPost.id) };
      setPosts(prev => [normalized, ...(Array.isArray(prev) ? prev : [])]);
      return normalized;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const updatePost = async (postId: string, data: { content?: string; tags?: string[] }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (data.content !== undefined) {
        payload.title = data.content.substring(0, 100);
        payload.description = data.content;
      }
      if (data.tags !== undefined) payload.tags = data.tags;

      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Error al actualizar la publicación');

      const updatedPost = await response.json();
      const normalized = { ...updatedPost, id: extractId(updatedPost._id ?? updatedPost.id) };
      setPosts(prev => (Array.isArray(prev) ? prev : []).map(p => p.id === postId ? { ...p, ...normalized } : p));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string): Promise<boolean> => {
    if (!postId || postId === 'undefined' || postId === 'null' || postId === '') return false;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Error al eliminar la publicación');
      setPosts(prev => (Array.isArray(prev) ? prev : []).filter(p => p.id !== postId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { posts, loading, uploading, error, fetchPosts, createPost, updatePost, deletePost };
}