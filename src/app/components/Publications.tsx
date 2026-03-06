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
  const { posts, uploading, createPost, updatePost, deletePost, fetchPosts } = usePosts(user?.id);
  const { savedPosts, savePost, unsavePost, isPostSaved } = useSavedPostsContext();
  const { isLiked, toggleLike, processingPostId: likingPostId, reactedPosts, postReactionCounts, fetchPostReactionCounts, getReactionCount } = usePostReactions(user?.id);

  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [likesOverride, setLikesOverride] = useState<Map<string, number>>(new Map());

  // Cargar posts cuando userId esté disponible (o cambie)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user?.id) fetchPosts(); }, [user?.id]);

  // Cargar conteo de reacciones cuando lleguen los posts
  useEffect(() => {
    if (!Array.isArray(posts) || posts.length === 0) return;
    const ids = posts.map(p => p.id).filter(Boolean);
    if (ids.length > 0) fetchPostReactionCounts(ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-container')) setOpenMenuId(null);
    };
    if (openMenuId !== null) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    if (!newPost.trim() && !selectedFile) return;
    if (!user) return;
    const result = await createPost({ content: newPost, imageFile: selectedFile || undefined, tags: [] });
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
      const id = String(deleteConfirmId);
      if (!id || id === 'undefined' || id === 'null' || id === '') {
        setDeleteConfirmId(null);
        return;
      }
      await deletePost(id);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => setDeleteConfirmId(null);

  const handleEdit = (id: string | number, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
    setOpenMenuId(null);
  };

  const saveEdit = async (id: string | number) => {
    const success = await updatePost(String(id), { content: editText });
    if (success) { setEditingId(null); setEditText(''); }
  };

  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const handleSave = async (postId: string | number) => {
    if (isProcessing || !user) return;
    const postIdStr = String(postId);
    if (!postIdStr || postIdStr === 'undefined' || postIdStr === 'null') return;

    setIsProcessing(true);
    setSavingPostId(postIdStr);
    try {
      const savedPost = savedPosts.find(sp => sp.postId === postIdStr);
      if (savedPost) {
        await unsavePost(savedPost.id);
      } else {
        await savePost(postIdStr, user.id);
      }
    } catch {
    } finally {
      setIsProcessing(false);
      setSavingPostId(null);
    }
  };

  const handleLike = async (postId: string | number) => {
    if (!user) return;
    const postIdStr = String(postId);
    if (!postIdStr || postIdStr === 'undefined') return;

    const wasLiked = isLiked(postIdStr);
    setLikesOverride(prev => {
      const next = new Map(prev);
      next.set(postIdStr, (next.get(postIdStr) ?? 0) + (wasLiked ? -1 : 1));
      return next;
    });

    const result = await toggleLike(postIdStr);
    if (result.liked === wasLiked) {
      setLikesOverride(prev => {
        const next = new Map(prev);
        next.set(postIdStr, (next.get(postIdStr) ?? 0) + (wasLiked ? 1 : -1));
        return next;
      });
    }
  };

  function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;
    return date.toLocaleDateString();
  }

  const publications: Publication[] = useMemo(() => {
    if (!Array.isArray(posts)) return [];
    return posts.map(post => {
      const postId = post.id || '';
      const imageUrl = post.mediaUrl
        || (post.content && (post.content.startsWith('http') || post.content.startsWith('/')) ? post.content : undefined);
      const textContent = post.description
        || (post.content && !post.content.startsWith('http') ? post.content : '')
        || post.title || '';
      const rawDate = post.createdAt || (post as { created_at?: string }).created_at;
      const hasServerCount = postId ? postReactionCounts.has(postId) : false;
      const serverCount = postId ? getReactionCount(postId) : 0;
      const likesDelta = (!hasServerCount && postId) ? (likesOverride.get(postId) ?? 0) : 0;
      const baseLikes = hasServerCount ? serverCount : (post.likesCount ?? 0);
      return {
        id: postId,
        content: textContent,
        image: imageUrl,
        date: rawDate ? new Date(rawDate).toLocaleDateString() : 'Sin fecha',
        time: rawDate ? formatTimeAgo(new Date(rawDate)) : '',
        text: textContent,
        likes: Math.max(0, baseLikes + likesDelta),
        saved: 0,
        isLiked: postId ? isLiked(postId) : false,
        reactionId: postId ? reactedPosts.get(postId) : undefined,
        isSaved: postId ? isPostSaved(postId) : false,
        author: { name: user?.name || 'Usuario', avatar: user?.profileImage || '' },
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, savedPosts, reactedPosts, postReactionCounts, likesOverride, user?.name, getReactionCount]);

  return (
    <div className="w-full">
      <div className="w-full flex flex-col items-center">
        <div className="w-full lg:max-w-2xl mb-6">
          <h2 className="text-white text-xl sm:text-2xl font-bold">Publicaciones</h2>
          <p className="text-white/80 text-xs sm:text-sm mt-1">
            Sube tu contenido y comparte tus ideas con la comunidad.
          </p>
        </div>

        <PublicationForm
          text={newPost}
          selectedImage={selectedImage}
          onTextChange={setNewPost}
          onImageSelect={handleImageSelect}
          onPublish={handlePublish}
          onCancel={handleCancel}
          isUploading={uploading}
        />

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
