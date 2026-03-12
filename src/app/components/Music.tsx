'use client';

import { useState, useEffect, useMemo } from 'react';
import { FaMusic, FaTrash, FaEdit } from 'react-icons/fa';
import { HiOutlineUpload } from "react-icons/hi";
import { Publication } from '@/app/types';
import MusicCard from './music/MusicCard';
import MusicPlayer from './music/MusicPlayer';
import AddMusicModal from './music/AddMusicModal';
import DeleteConfirmModal from './common/DeleteConfirmModal';
import { usePosts } from '../hooks/usePosts';
import { useUser } from '../hooks/useUser';

export default function Musica() {
  const { user } = useUser();
  const { posts, uploading, createPost, deletePost, fetchPosts } = usePosts(user?.id);

  const [activeMusicPost, setActiveMusicPost] = useState<Publication | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => { if (user?.id) fetchPosts(); }, [user?.id]);

  // Filtrar solo posts de audio
  const musicPosts: Publication[] = useMemo(() => {
    if (!Array.isArray(posts)) return [];
    return posts
      .filter((p: any) => p.type === 'audio')
      .map((p: any) => ({
        id: p.id || '',
        type: 'audio' as const,
        title: p.title || 'Sin título',
        content: p.content || '',
        description: p.description,
        provider: p.provider,
        provider_meta: p.provider_meta,
        created_at: p.createdAt || p.created_at,
        date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-MX') : '',
        likes: p.likesCount ?? 0,
        isLiked: false,
        isSaved: false,
      }));
  }, [posts]);

  const handleAddMusic = async (data: { title: string; url: string; description?: string }) => {
    if (!user) return;
    await createPost({
      type: 'audio',
      title: data.title,
      url: data.url,
      description: data.description,
    });
    setShowAddModal(false);
    await fetchPosts();
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    await deletePost(deleteConfirmId);
    if (activeMusicPost && String(activeMusicPost.id) === deleteConfirmId) {
      setActiveMusicPost(null);
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-white text-xl sm:text-2xl font-bold">Música</h2>
          <p className="text-white/60 text-xs sm:text-sm mt-1">
            Reproduce y administra tu contenido
          </p>  
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white text-sm font-medium rounded-sm hover:from-riff-primary hover:to-riff-primary-dark transition-all duration-200 flex items-center gap-2"        >
          <HiOutlineUpload className="w-4 h-4" />
          Subir Canción
        </button>
      </div>

      {musicPosts.length === 0 ? (
        <div className="text-center py-20">
          <FaMusic className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">Aún no has subido canciones.</p>

        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Player activo */}
          {activeMusicPost && (
            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
                  <FaMusic className="w-6 h-6 text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{activeMusicPost.title}</p>
                  <p className="text-white/50 text-xs truncate">{user?.name}</p>
                </div>
              </div>
              <div className="mt-3">
                <MusicPlayer
                  provider={activeMusicPost.provider ?? 'soundcloud'}
                  embedUrl={activeMusicPost.content}
                  originalUrl={activeMusicPost.provider_meta?.provider_url}
                />
              </div>
            </div>
          )}

          {/* Lista "Mis canciones" */}
          <div>
            <h3 className="text-white text-sm font-medium mb-3 opacity-70">Mis canciones</h3>
            <div className="space-y-2">
              {musicPosts.map(post => (
                <div key={post.id} className="relative group">
                  <MusicCard
                    post={post}
                    artistName={user?.name ?? ''}
                    isActive={activeMusicPost?.id === post.id}
                    isSaved={false}
                    onSelect={p => setActiveMusicPost(prev => prev?.id === p.id ? null : p)}
                  />

                  {/* Acciones de gestión (editar / eliminar) — visibles al hover */}
                  <div className="absolute right-14 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDeleteConfirmId(String(post.id))}
                      className="w-7 h-7 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Eliminar"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar */}
      <AddMusicModal
        isOpen={showAddModal}
        isUploading={uploading}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMusic}
      />

      {/* Confirmar eliminación */}
      <DeleteConfirmModal
        isOpen={!!deleteConfirmId}
        title="Eliminar canción"
        message="¿Estás seguro de que quieres eliminar esta canción? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}