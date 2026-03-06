import { useState } from 'react';
import { validateImageFile, uploadToR2 } from '../utils/r2Storage';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const API_URL = API_BASE_URL;

// Extrae el id string de un objeto devuelto por el backend.
// El backend puede devolver { id }, { _id } o { _id: { $oid } } (sin procesar de Mongo).
// Esta función normaliza cualquiera de esos casos a un string limpio.
function extractId(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    // Caso: { $oid: "..." } — backend no procesó el _id de Mongo
    if (obj.$oid) return String(obj.$oid);
    // Caso: { _id: "..." } o { _id: { $oid: "..." } }
    if (obj._id) return extractId(obj._id);
    // Caso: { id: "..." }
    if (obj.id) return extractId(obj.id);
  }
  return String(raw);
}

export interface Post {
  id: string;
  authorId?: string;
  sql_user_id?: string;
  title?: string;
  description?: string; // Texto real de la publicación
  content?: string;     // En algunos backends es la URL de la imagen
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  type?: string;
  tags?: string[];
  likesCount?: number;
  commentsCount?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
}

export interface CreatePostData {
  content: string;
  imageFile?: File;
  tags?: string[];
}

export function usePosts(userId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  /**
   * Obtener publicaciones del usuario actual
   */
  const fetchPosts = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // GET /posts trae todos; filtramos por userId en cliente
      const response = await fetch(`${API_URL}/posts`, { headers });

      if (!response.ok) {
        throw new Error('Error al obtener las publicaciones');
      }

      const data = await response.json();
      const rawArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.posts)
        ? data.posts
        : [];

      // Normalizar cada post - extraer ID correctamente (puede ser string, {$oid:...}, o nested)
      const allPosts = rawArray
        .map((p: Record<string, unknown>) => {
          const id = extractId(p._id ?? p.id);
          return { ...p, id };
        })
        .filter((p: Record<string, unknown>) => p.id && p.id !== 'undefined' && p.id !== 'null' && p.id !== '');

      // Filtrar por userId si está disponible (solo mostrar posts del usuario actual)
      const postsArray = userId
        ? allPosts.filter((p: Record<string, unknown>) => {
            const postAuthor = String(p.sql_user_id ?? p.authorId ?? '');
            return postAuthor === userId;
          })
        : allPosts;

      setPosts(postsArray);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crear una nueva publicación
   */
  const createPost = async (postData: CreatePostData): Promise<Post | null> => {
    if (!userId) {
      setError('Usuario no autenticado');
      return null;
    }

    setUploading(true);
    setError(null);

    try {
      // Validar imagen si existe
      if (postData.imageFile) {
        const validation = validateImageFile(postData.imageFile);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      // Usar FormData para enviar archivo e información juntos
      const formData = new FormData();

      // Campos en el orden correcto según backend
      const titleValue = postData.content.substring(0, 100) || 'Nueva publicación';
      const descriptionValue = postData.content || 'Sin descripción';

      formData.append('sql_user_id', userId);
      formData.append('type', 'image'); // Siempre 'image' o 'audio'
      formData.append('title', titleValue);
      formData.append('description', descriptionValue);

      // Agregar imagen si existe
      if (postData.imageFile) {
        formData.append('image', postData.imageFile);
      }

      // Agregar tags como JSON string (opcional)
      if (postData.tags && postData.tags.length > 0) {
        formData.append('tags', JSON.stringify(postData.tags));
      }

      // Obtener token JWT del localStorage
      const token = localStorage.getItem('token');

      let response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      // Si la respuesta indica que el endpoint no soporta multipart o retorno 404, intentamos fallback
      if (!response.ok && (response.status === 404 || response.status === 415 || response.status === 400)) {
        // Si hay imagen, subir a R2 primero
        let mediaUrl: string | undefined;
        if (postData.imageFile) {
          mediaUrl = await uploadToR2(postData.imageFile);
        }

        // Enviar post como JSON con la URL de la imagen
        const payload: Record<string, unknown> = {
           sql_user_id: userId,
           type: 'image',
           title: titleValue,
           description: descriptionValue,
         };
         if (mediaUrl) payload.mediaUrl = mediaUrl;

        response = await fetch(`${API_URL}/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Error ${response.status}`);
        }
      }

      if (!response.ok) {
        const errorText = await response.text();

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const newPost = await response.json();

      // Normalizar el ID del nuevo post antes de agregarlo al estado
      const normalizedPost = {
        ...newPost,
        id: extractId(newPost._id ?? newPost.id),
      };

      // Agregar el nuevo post al estado (protegido contra prevPosts no iterable)
      setPosts(prevPosts => [normalizedPost, ...(Array.isArray(prevPosts) ? prevPosts : [])]);

      return normalizedPost;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Actualizar una publicación
   */
  const updatePost = async (
    postId: string,
    data: { content?: string; tags?: string[] }
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar la publicación');
      }

      const updatedPost = await response.json();

      // Actualizar en el estado
      setPosts(prevPosts =>
        (Array.isArray(prevPosts) ? prevPosts : []).map(post => post.id === postId ? updatedPost : post)
      );

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Eliminar una publicación
   */
  const deletePost = async (postId: string): Promise<boolean> => {
    if (!postId || postId === 'undefined' || postId === 'null' || postId === '') {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la publicación');
      }

      // Eliminar del estado
      setPosts(prevPosts => (Array.isArray(prevPosts) ? prevPosts : []).filter(post => post.id !== postId));

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    posts,
    loading,
    uploading,
    error,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
  };
}
