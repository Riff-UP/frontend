import { useState } from 'react';
import { validateImageFile } from '../utils/r2Storage';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const API_URL = API_BASE_URL;

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
   * Obtener todas las publicaciones
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

      const response = await fetch(`${API_URL}/posts`, { headers });

      if (!response.ok) {
        throw new Error('Error al obtener las publicaciones');
      }

      const data = await response.json();
      // Normalizar respuesta: el backend puede devolver array directo o { data: [...] } / { posts: [...] }
      const rawArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.posts)
        ? data.posts
        : [];

      // Normalizar cada post: asegurar que id sea siempre un string limpio
      const postsArray = rawArray.map((p: Record<string, unknown>) => {
        const rawId = p._id ?? p.id;
        const id = typeof rawId === 'object' && rawId !== null && '$oid' in rawId
          ? String((rawId as { $oid: string }).$oid)
          : String(rawId ?? '');
        return { ...p, id };
      });

      setPosts(postsArray);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error al obtener posts:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crear una nueva publicación
   */
  const createPost = async (postData: CreatePostData): Promise<Post | null> => {
    console.log('🚀 createPost iniciado', {
      userId,
      hasContent: !!postData.content,
      hasImageFile: !!postData.imageFile,
      contentLength: postData.content?.length
    });

    if (!userId) {
      console.error('❌ Error: No hay userId');
      setError('Usuario no autenticado');
      return null;
    }

    setUploading(true);
    setError(null);

    try {
      // Validar imagen si existe
      if (postData.imageFile) {
        console.log('📸 Validando imagen...', {
          name: postData.imageFile.name,
          size: postData.imageFile.size,
          type: postData.imageFile.type,
        });

        const validation = validateImageFile(postData.imageFile);
        if (!validation.valid) {
          console.error('❌ Validación falló:', validation.error);
          throw new Error(validation.error);
        }
        console.log('✅ Imagen válida');
      }

      console.log('📦 Preparando FormData para envío...');
      console.log('🔍 userId disponible:', userId);
      console.log('🔍 postData.content:', postData.content);

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
        console.log('📎 Imagen agregada al FormData');
      }

      // Agregar tags como JSON string (opcional)
      if (postData.tags && postData.tags.length > 0) {
        formData.append('tags', JSON.stringify(postData.tags));
      }

      // Log detallado de todos los campos del FormData
      console.log('📦 FormData preparado con campos:');
      console.log('  - sql_user_id:', userId);
      console.log('  - type:', 'image');
      console.log('  - title:', titleValue);
      console.log('  - description:', descriptionValue);
      console.log('  - hasImage:', !!postData.imageFile);

      // Mostrar todos los campos del FormData
      for (const pair of formData.entries()) {
        console.log(`  FormData[${pair[0]}]:`, typeof pair[1] === 'string' ? pair[1] : 'File');
      }

      console.log('📡 Enviando POST con FormData a:', `${API_URL}/posts`);

      // Obtener token JWT del localStorage
      const token = localStorage.getItem('token');
      console.log('🔐 Token JWT:', token ? 'Presente' : '❌ NO ENCONTRADO');

      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // Token JWT para autenticación
        },
        body: formData, // FormData sin Content-Type header
      });

      console.log('📨 Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del backend:', errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const newPost = await response.json();
      console.log('✅ Post creado exitosamente:', newPost);

      // Agregar el nuevo post al estado (protegido contra prevPosts no iterable)
      setPosts(prevPosts => [newPost, ...(Array.isArray(prevPosts) ? prevPosts : [])]);

      return newPost;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('💥 Error completo en createPost:', err);
      setError(errorMessage);
      return null;
    } finally {
      setUploading(false);
      console.log('🏁 createPost finalizado');
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
      console.error('Error al actualizar post:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Eliminar una publicación
   */
  const deletePost = async (postId: string): Promise<boolean> => {
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
      console.error('Error al eliminar post:', err);
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

