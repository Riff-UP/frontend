'use client';

import { useState, useEffect, useMemo } from 'react';
import { Publication } from '@/app/types';
import PublicationForm from './publications/PublicationForm';
import PublicationListCard from './publications/PublicationListCard';
import DeleteConfirmModal from './common/DeleteConfirmModal';
import { usePosts } from '../hooks/usePosts';
import { useUser } from '../hooks/useUser';
import { useSavedPosts } from '../hooks/useSavedPosts';

export default function Publications() {
  const { user } = useUser();
  const { posts, uploading, error: postsError, createPost, updatePost, deletePost, fetchPosts } = usePosts(user?.id);
  const { savedPosts, savePost, unsavePost, isPostSaved } = useSavedPosts(user?.id);

  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Lock para evitar múltiples requests

  // Cargar posts al montar el componente
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPosts(); }, []);

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
        // Si ya está guardado, eliminarlo
        // Pequeño delay para asegurar que el backend haya procesado el POST anterior
        await new Promise(resolve => setTimeout(resolve, 100));
        await unsavePost(savedPost.id);
      } else {
        // Si no está guardado, guardarlo
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

  // Convertir posts del backend al formato de Publication para el componente
  // Usar useMemo para que se recalcule cuando savedPosts cambia
  const publications: Publication[] = useMemo(() => {
    if (!Array.isArray(posts)) return [];

    return posts.map(post => {
      // Obtener el ID del post - puede venir como id o _id
      const postId = post.id || (post as any)._id || '';

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
      return {
        id: postId,
        content: textContent,
        image: imageUrl,
        date: rawDate ? new Date(rawDate).toLocaleDateString() : 'Sin fecha',
        time: rawDate && typeof window !== 'undefined' ? formatTimeAgo(new Date(rawDate)) : '',
        text: textContent,
        likes: post.likesCount ?? 0,
        saved: 0,
        isLiked: false,
        isSaved: postId ? isPostSaved(postId) : false, // ✅ Se recalcula cuando savedPosts cambia
        author: {
          name: user?.name || 'Usuario',
          avatar: '',
        },
      };
    });
  }, [posts, savedPosts, isPostSaved, user?.name]); // ✅ Dependencias: recalcula cuando savedPosts cambia

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
                onMenuToggle={() => setOpenMenuId(openMenuId === pub.id ? null : pub.id)}
                onEdit={() => handleEdit(pub.id, pub.text || '')}
                onDelete={() => handleDelete(pub.id)}
                onSave={handleSave}
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
