'use client';

import { useState, useEffect, useMemo } from 'react';
import { Publication } from '@/app/types';
import PublicationForm from './publications/PublicationForm';
import PublicationListCard from './publications/PublicationListCard';
import DeleteConfirmModal from './common/DeleteConfirmModal';
import { usePosts } from '../hooks/usePosts';
import { useUser } from '../hooks/useUser';
import { useSavedPostsContext } from '../context/SavedPostsContext';
import { usePostReactions } from '../hooks/usePostReactions';

export default function Publications() {
  const { user } = useUser();
  const { posts, uploading, error: postsError, createPost, updatePost, deletePost, fetchPosts } = usePosts(user?.id);
  const { savedPosts, savePost, unsavePost, isPostSaved } = useSavedPostsContext();
  const { isLiked, toggleLike, processingPostId: likingPostId, reactedPosts, postReactionCounts, fetchPostReactionCounts, getReactionCount } = usePostReactions(user?.id);

  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Override local de contadores de likes (postId -> delta) para reflejo inmediato
  const [likesOverride, setLikesOverride] = useState<Map<string, number>>(new Map());

  // Cargar posts al montar el componente
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPosts(); }, []);

  // Cuando los posts cambien, cargar el conteo real de reacciones de cada post
  useEffect(() => {
    if (!Array.isArray(posts) || posts.length === 0) return;
    const ids = posts.map(p => p.id).filter(Boolean);
    if (ids.length > 0) fetchPostReactionCounts(ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  useEffect(() => {
    if (!postsError) return;
    const timer = setTimeout(() => setErrorMessage(null), 5000);
    setErrorMessage(postsError);
    return () => clearTimeout(timer);
  }, [postsError]);


  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    if (!newPost.trim() && !selectedFile) return;
    if (!user) {
      setErrorMessage('Debes iniciar sesión para publicar');
      return;
    }

    const result = await createPost({
      content: newPost,
      imageFile: selectedFile || undefined,
      tags: [],
    });

    if (result) {
      setNewPost('');
      setSelectedImage(null);
      setSelectedFile(null);
    }
  };

  const handleCancel = () => {
    setNewPost('');
    setSelectedImage(null);
    setSelectedFile(null);
  };

  const handleDelete = (id: string | number) => {
    setDeleteConfirmId(id);
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId !== null) {
      await deletePost(String(deleteConfirmId)); // Convertir a string para el API
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleEdit = (id: string | number, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
    setOpenMenuId(null);
  };

  const saveEdit = async (id: string | number) => {
    const success = await updatePost(String(id), { content: editText }); // Convertir a string para el API
    if (success) {
      setEditingId(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSave = async (postId: string | number) => {
    // Evitar múltiples requests simultáneos
    if (isProcessing) {
      console.log('⏸️ Ya hay una operación en proceso, ignorando click');
      return;
    }

    if (!user) {
      setErrorMessage('Debes iniciar sesión para guardar publicaciones');
      return;
    }

    const postIdStr = String(postId);

    // Validar que el ID no sea vacío, 'undefined' o 'null'
    if (!postIdStr || postIdStr === 'undefined' || postIdStr === 'null' || postIdStr === '') {
      console.error('ID de post inválido:', postId);
      setErrorMessage('Error: ID de publicación inválido');
      return;
    }

    // Activar lock
    setIsProcessing(true);
    setSavingPostId(postIdStr);

    try {
      const savedPost = savedPosts.find(sp => sp.postId === postIdStr);

      if (savedPost) {
        await new Promise(resolve => setTimeout(resolve, 100));
        await unsavePost(savedPost.id);
      } else {
        await savePost(postIdStr, user.id);
      }
    } catch (error) {
      console.error('Error al guardar/quitar guardado:', error);
      setErrorMessage('Error al procesar la acción');
    } finally {
      // Limpiar lock y estado de loading
      setIsProcessing(false);
      setSavingPostId(null);
    }
  };

  const handleLike = async (postId: string | number) => {
    if (!user) {
      setErrorMessage('Debes iniciar sesión para reaccionar');
      return;
    }
    const postIdStr = String(postId);
    if (!postIdStr || postIdStr === 'undefined') return;

    const wasLiked = isLiked(postIdStr);

    // Optimistic update del contador
    setLikesOverride(prev => {
      const next = new Map(prev);
      const currentDelta = next.get(postIdStr) ?? 0;
      next.set(postIdStr, wasLiked ? currentDelta - 1 : currentDelta + 1);
      return next;
    });

    const result = await toggleLike(postIdStr);

    // Si el resultado no coincide con lo esperado, corregir el contador
    if (result.liked === wasLiked) {
      // Algo salió mal (el toggle no cambió el estado), revertir delta
      setLikesOverride(prev => {
        const next = new Map(prev);
        const currentDelta = next.get(postIdStr) ?? 0;
        next.set(postIdStr, wasLiked ? currentDelta + 1 : currentDelta - 1);
        return next;
      });
    }
  };

  // Convertir posts del backend al formato de Publication para el componente
  // Usar useMemo para que se recalcule cuando savedPosts cambia
  const publications: Publication[] = useMemo(() => {
    if (!Array.isArray(posts)) return [];

    return posts.map(post => {
      // Obtener el ID del post - ya normalizado a id por usePosts
      const postId = post.id || '';

      // Detectar la URL de imagen: mediaUrl tiene prioridad, luego content si parece una URL
      const imageUrl = post.mediaUrl
        || (post.content && (post.content.startsWith('http') || post.content.startsWith('/'))
            ? post.content
            : undefined);

      // El texto real es description, o content si no parece una URL
      const textContent = post.description
        || (post.content && !post.content.startsWith('http') ? post.content : '')
        || post.title
        || '';

      const rawDate = post.createdAt || (post as { created_at?: string }).created_at;
      // Si el servidor ya devolvió el conteo real para este post, usarlo directo (sin delta).
      // Solo aplicar el delta optimista mientras el servidor aún no ha respondido.
      const hasServerCount = postId ? postReactionCounts.has(postId) : false;
      const serverCount = postId ? getReactionCount(postId) : 0;
      const likesDelta = (!hasServerCount && postId) ? (likesOverride.get(postId) ?? 0) : 0;
      const baseLikes = hasServerCount ? serverCount : (post.likesCount ?? 0);
      return {
        id: postId,
        content: textContent,
        image: imageUrl,
        date: rawDate ? new Date(rawDate).toLocaleDateString() : 'Sin fecha',
        time: rawDate && typeof window !== 'undefined' ? formatTimeAgo(new Date(rawDate)) : '',
        text: textContent,
        likes: Math.max(0, baseLikes + likesDelta),
        saved: 0,
        isLiked: postId ? isLiked(postId) : false,
        reactionId: postId ? reactedPosts.get(postId) : undefined,
        isSaved: postId ? isPostSaved(postId) : false,
        author: {
          name: user?.name || 'Usuario',
          avatar: '',
        },
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, savedPosts, reactedPosts, postReactionCounts, likesOverride, user?.name, getReactionCount]);

  // Función para formatear tiempo relativo
  function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;

    return date.toLocaleDateString();
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-container')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  return (
    <div className="w-full">
      <div className="w-full flex flex-col items-center">
        {/* Title */}
        <div className="w-full lg:max-w-2xl mb-6">
          <h2 className="text-white text-xl sm:text-2xl font-bold">Publicaciones</h2>
          <p className="text-white/80 text-xs sm:text-sm mt-1">
            Sube tu contenido y comparte tus ideas con la comunidad.
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="w-full lg:max-w-2xl mb-4 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-sm">
            {errorMessage}
          </div>
        )}

        {/* Create Publication Form */}
        <PublicationForm
          text={newPost}
          selectedImage={selectedImage}
          onTextChange={setNewPost}
          onImageSelect={handleImageSelect}
          onPublish={handlePublish}
          onCancel={handleCancel}
          isUploading={uploading}
        />

        {/* Publications List */}
        <div className="w-full lg:max-w-2xl">
          <div className="space-y-4">
            {publications.map((pub) => (
              <PublicationListCard
                key={pub.id}
                publication={pub}
                isMenuOpen={openMenuId === pub.id}
                isEditing={editingId === pub.id}
                editText={editText}
                isSaving={savingPostId === pub.id}
                isLiking={likingPostId === String(pub.id)}
                onMenuToggle={() => setOpenMenuId(openMenuId === pub.id ? null : pub.id)}
                onEdit={() => handleEdit(pub.id, pub.text || '')}
                onDelete={() => handleDelete(pub.id)}
                onSave={handleSave}
                onLike={handleLike}
                onEditTextChange={setEditText}
                onSaveEdit={() => saveEdit(pub.id)}
                onCancelEdit={cancelEdit}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Eliminar publicación"
        message="¿Estás seguro de que quieres eliminar esta publicación? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
