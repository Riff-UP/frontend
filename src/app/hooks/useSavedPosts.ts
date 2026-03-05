'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

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

export interface CreateSavedPostData {
  postId: string;
  userId: string;
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

      // El backend obtiene el userId del JWT, no enviar como query param
      const url = `${API_URL}/posts/saved`;

      const res = await fetch(url, { headers });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));

        // Si es error 500, no fallar completamente - solo log y continuar
        if (res.status === 500) {
          console.warn('⚠️ Backend con problemas (500), continuando con lista vacía');
          setSavedPosts([]); // Lista vacía en lugar de fallar
          setError(null); // No mostrar error al usuario
          return;
        }

        throw new Error(errorData.message || 'Error al obtener posts guardados');
      }

      const data = await res.json();

      // Normalizar respuesta del backend
      const postsArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      // Normalizar cada post: convertir _id a id, post_id a postId, etc.
      const normalizedPosts = postsArray.map((post: any) => ({
        id: post._id || post.id,
        postId: post.post_id || post.postId,
        userId: post.sql_user_id || post.userId,
        createdAt: post.saved_at || post.createdAt,
        post: post.post
      }));

      setSavedPosts(normalizedPosts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error al obtener posts guardados:', err);
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

      console.log('POST /posts/saved - Payload:', payload);

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
        console.error('Error del backend:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData
        });

        // Si el error es 409 (Conflict), el post ya está guardado
        // Hacer GET para obtener todos los guardados y encontrar el ID real
        if (res.status === 409) {
          console.warn('⚠️ Post ya guardado (409 Conflict), obteniendo ID real...');

          try {
            // Hacer GET para obtener todos los posts guardados
            // El backend obtiene el userId del JWT
            const getRes = await fetch(`${API_URL}/posts/saved`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (getRes.ok) {
              const allSaved = await getRes.json();
              const savedArray = Array.isArray(allSaved) ? allSaved : (allSaved?.data || []);

              // Encontrar el post específico
              const existing = savedArray.find((sp: any) =>
                (sp.post_id || sp.postId) === postId
              );

              if (existing) {
                // Normalizar y retornar el objeto real
                const normalizedPost: SavedPost = {
                  id: existing._id || existing.id,
                  postId: existing.post_id || existing.postId,
                  userId: existing.sql_user_id || existing.userId,
                  createdAt: existing.saved_at || existing.createdAt
                };

                // Actualizar el estado con el objeto real
                setSavedPosts(prev => {
                  // Verificar si ya existe para evitar duplicados
                  if (prev.some(p => p.id === normalizedPost.id)) {
                    return prev;
                  }
                  return [...prev, normalizedPost];
                });

                return normalizedPost;
              }
            }
          } catch (getErr) {
            console.error('Error al obtener posts guardados:', getErr);
          }

          // Si no se pudo obtener, retornar null
          return null;
        }

        throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
      }

      const savedPost = await res.json();
      console.log('Post guardado exitosamente:', savedPost);

      // Normalizar: El backend devuelve _id, pero necesitamos id
      const normalizedPost: SavedPost = {
        id: savedPost._id || savedPost.id,
        postId: savedPost.post_id || savedPost.postId,
        userId: savedPost.sql_user_id || savedPost.userId,
        createdAt: savedPost.saved_at || savedPost.createdAt
      };

      // Agregar al estado local con el objeto normalizado
      setSavedPosts(prev => [...prev, normalizedPost]);

      return normalizedPost;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar post';
      console.error('Error en savePost:', err);
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

      console.log(`DELETE /posts/saved/${savedPostId}`);

      const res = await fetch(`${API_URL}/posts/saved/${savedPostId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        console.error('Error del backend:', errorData);

        // Si es 404, el post ya no existe en el backend (o nunca existió)
        // Eliminarlo del estado local de todas formas
        if (res.status === 404) {
          console.warn('⚠️ Post no encontrado en backend (404), eliminando del estado local');
          setSavedPosts(prev => {
            const newList = prev.filter(sp => sp.id !== savedPostId);
            console.log('📋 Nuevos posts guardados:', newList.length);
            return newList;
          });
          return true; // Considerarlo exitoso ya que el objetivo era eliminarlo
        }

        throw new Error(errorData.message || 'Error al eliminar post guardado');
      }

      console.log('✅ Post eliminado de guardados exitosamente');

      // Eliminar del estado local
      setSavedPosts(prev => {
        const newList = prev.filter(sp => sp.id !== savedPostId);
        console.log('📋 Nuevos posts guardados:', newList.length);
        return newList;
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar post guardado');
      console.error('Error en unsavePost:', err);
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

