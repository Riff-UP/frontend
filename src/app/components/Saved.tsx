'use client';

import { useState } from 'react';
import { MdBookmark } from 'react-icons/md';
import { FaMusic } from "react-icons/fa";
import TabNavigation from './common/TabNavigation';
import { useSavedPostsContext } from '../context/SavedPostsContext';
import { useUser } from '../hooks/useUser';
import Image from 'next/image';

export default function Saved() {
  const [activeTab, setActiveTab] = useState<'publicaciones' | 'canciones'>('publicaciones');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { user } = useUser();
  const {
    savedPosts,
    loading: postsLoading,
    unsavePost,
  } = useSavedPostsContext();

  const handleUnsavePost = async (savedPostId: string) => {
    if (removingId || !savedPostId) return;
    setRemovingId(savedPostId);
    try {
      await unsavePost(savedPostId);
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return ''; }
  };

  const tabs = [
    { id: 'publicaciones' as const, label: 'Publicaciones'},
    { id: 'canciones' as const, label: 'Canciones'},
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-white text-xl sm:text-2xl font-bold">Guardados</h2>
        <p className="text-white/80 text-xs sm:text-sm mt-1">
          Accede a tus publicaciones y canciones guardadas.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'publicaciones' | 'canciones')}
        />
      </div>

      {/* Content */}
      <div className="">
        {activeTab === 'publicaciones' && (
          <div className="p-0 sm:p-0">
            <h3 className="text-white text-base sm:text-lg font-semibold mb-4">Publicaciones guardadas</h3>

            {postsLoading ? (
              <div className="text-center py-12">
                <p className="text-riff-text-secondary text-sm">Cargando publicaciones...</p>
              </div>
            ) : savedPosts.length === 0 ? (
              <div className="text-center py-12">
                <MdBookmark className="w-12 h-12 text-riff-text-secondary mx-auto mb-4" />
                <p className="text-riff-text-secondary text-sm">No tienes publicaciones guardadas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedPosts.map((savedPost, index) => {
                  const key = savedPost.id || savedPost.postId || `saved-${index}`;
                  const post = savedPost.post;
                  const isRemoving = removingId === savedPost.id;

                  // Detectar si el content es una URL de imagen
                  const isContentUrl = post?.content && (
                    post.content.startsWith('http') || post.content.startsWith('/')
                  );
                  const imageUrl = post?.mediaUrl || (isContentUrl ? post?.content : undefined);
                  const textContent = post?.description
                    || post?.title
                    || (post?.content && !isContentUrl ? post.content : '')
                    || '';

                  return (
                    <div
                      key={key}
                      className={`bg-riff-header rounded-sm p-4 transition-opacity duration-200 ${isRemoving ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-8 h-8 bg-gradient-to-br from-riff-primary-dark to-riff-primary rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-medium">
                              {(user?.name || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-semibold text-sm">
                                {user?.name || 'Usuario'}
                              </span>
                              <span className="text-riff-text-secondary text-xs">
                                {formatDate(post?.createdAt || savedPost.createdAt)}
                              </span>
                            </div>
                            {textContent && (
                              <p className="text-white text-sm leading-relaxed">{textContent}</p>
                            )}
                            {/* Si no hay post populado, mostrar mensaje */}
                            {!post && (
                              <p className="text-riff-text-secondary text-xs mt-1 italic">
                                Publicación guardada
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Botón quitar de guardados */}
                        <button
                          onClick={() => handleUnsavePost(savedPost.id)}
                          disabled={isRemoving || !savedPost.id}
                          className="text-yellow-400 hover:text-white transition-colors flex-shrink-0 disabled:opacity-50"
                          title="Quitar de guardados"
                        >
                          <MdBookmark className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Imagen */}
                      {imageUrl && (
                        <div className="mt-3 overflow-hidden rounded-sm">
                          <Image
                            src={imageUrl}
                            alt="Post media"
                            width={800}
                            height={400}
                            style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'canciones' && (
          <div className="p-0 sm:p-0">
            <h3 className="text-white text-base sm:text-lg font-semibold mb-4">Canciones guardadas</h3>
            <div className="text-center py-12">
              <FaMusic className="w-12 h-12 text-riff-text-secondary mx-auto mb-4" />
              <p className="text-riff-text-secondary text-sm">No tienes canciones guardadas</p>
              <p className="text-riff-text-secondary text-xs mt-2">Próximamente podrás guardar tus canciones favoritas</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}