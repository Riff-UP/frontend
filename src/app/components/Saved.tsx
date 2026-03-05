'use client';

import { useState } from 'react';
import { MdBookmark, MdBookmarkBorder } from 'react-icons/md';
import { FaMusic } from "react-icons/fa";
import { BsCalendarEventFill } from "react-icons/bs";
import TabNavigation from './common/TabNavigation';
import { useSavedPosts } from '../hooks/useSavedPosts';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { useUser } from '../hooks/useUser';
import Image from 'next/image';

export default function Saved() {
  const [activeTab, setActiveTab] = useState<'publicaciones' | 'canciones' | 'eventos'>('publicaciones');
  const [undoMessage, setUndoMessage] = useState<{type: 'publication' | 'event', id: string, item: unknown} | null>(null);

  // Obtener el usuario actual
  const { user } = useUser();
  const userId = user?.id;

  // Hooks para posts y eventos guardados
  const {
    savedPosts,
    loading: postsLoading,
    error: postsError,
    unsavePost,
  } = useSavedPosts(userId);

  const {
    savedEvents,
    loading: eventsLoading,
    error: eventsError,
    unsaveEvent,
  } = useSavedEvents(userId);

  const handleUnsavePost = async (savedPostId: string) => {
    // Mostrar mensaje de deshacer antes de eliminar
    const savedPost = savedPosts.find(p => p.id === savedPostId);
    if (savedPost) {
      setUndoMessage({type: 'publication', id: savedPostId, item: savedPost});

      // Eliminar después de 3 segundos si no se deshace
      setTimeout(async () => {
        setUndoMessage(current => {
          if (current?.type === 'publication' && current?.id === savedPostId) {
            unsavePost(savedPostId);
            return null;
          }
          return current;
        });
      }, 3000);
    }
  };

  const handleUnsaveEvent = async (savedEventId: string) => {
    // Mostrar mensaje de deshacer antes de eliminar
    const savedEvent = savedEvents.find(e => e.id === savedEventId);
    if (savedEvent) {
      setUndoMessage({type: 'event', id: savedEventId, item: savedEvent});

      // Eliminar después de 3 segundos si no se deshace
      setTimeout(async () => {
        setUndoMessage(current => {
          if (current?.type === 'event' && current?.id === savedEventId) {
            unsaveEvent(savedEventId);
            return null;
          }
          return current;
        });
      }, 3000);
    }
  };

  const undoRemoval = () => {
    if (undoMessage) {
      // Solo cancelar el mensaje de deshacer
      setUndoMessage(null);
    }
  };

  const formatEventDate = (dateString: string, timeString?: string) => {
    const [year, month, day] = dateString.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    if (timeString) {
      return `${formattedDate} • ${timeString}`;
    }
    return formattedDate;
  };

  const tabs = [
    { id: 'publicaciones' as const, label: 'Publicaciones'},
    { id: 'canciones' as const, label: 'Canciones'},
    { id: 'eventos' as const, label: 'Eventos'}
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-white text-xl sm:text-2xl font-bold">Guardados</h2>
        <p className="text-white/80 text-xs sm:text-sm mt-1">
          Accede a tus publicaciones, canciones y eventos guardados.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'publicaciones' | 'canciones' | 'eventos')}
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
            ) : postsError ? (
              <div className="text-center py-12">
                <p className="text-red-400 text-sm">{postsError}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Log para debugging */}
                {console.log('📋 Posts guardados en Saved:', savedPosts)}

                {savedPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <MdBookmark className="w-12 h-12 text-riff-text-secondary mx-auto mb-4" />
                    <p className="text-riff-text-secondary text-sm">No tienes publicaciones guardadas</p>
                  </div>
                ) : (
                  savedPosts.map((savedPost) => {
                    // Log individual para ver qué contiene cada savedPost
                    console.log('📝 SavedPost:', savedPost);

                    const post = savedPost.post;

                    // Si no hay post populated, mostrar info básica
                    if (!post) {
                      return (
                        <div key={savedPost.id} className="bg-riff-header rounded-sm p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-white text-sm">Post ID: {savedPost.postId}</p>
                              <p className="text-riff-text-secondary text-xs mt-1">
                                Guardado el: {savedPost.createdAt ? new Date(savedPost.createdAt).toLocaleDateString() : 'N/A'}
                              </p>
                              <p className="text-yellow-400 text-xs mt-2">
                                ⚠️ Los detalles del post no están disponibles
                              </p>
                            </div>
                            <button
                              onClick={() => handleUnsavePost(savedPost.id)}
                              className="text-yellow-400 hover:text-yellow-300 transition-colors flex-shrink-0"
                            >
                              <MdBookmark className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={savedPost.id} className="bg-riff-header rounded-sm p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-8 h-8 bg-gradient-to-br from-riff-primary-dark to-riff-primary rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-medium">
                                {post.authorId?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-semibold text-sm">
                                  {post.authorId || 'Usuario'}
                                </span>
                                <span className="text-riff-text-secondary text-xs">
                                  {post.createdAt ? formatEventDate(post.createdAt.split('T')[0]) : ''}
                                </span>
                              </div>
                              <p className="text-white text-sm leading-relaxed">{post.content}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnsavePost(savedPost.id)}
                            className={`transition-colors flex-shrink-0 ${
                              undoMessage?.type === 'publication' && undoMessage?.id === savedPost.id
                                ? 'text-riff-text-secondary hover:text-riff-text-secondary/80'
                                : 'text-yellow-400 hover:text-yellow-300'
                            }`}
                          >
                            {undoMessage?.type === 'publication' && undoMessage?.id === savedPost.id ? (
                              <MdBookmarkBorder className="w-5 h-5" />
                            ) : (
                              <MdBookmark className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        {post.mediaUrl && (
                          <div className="mt-3">
                            <Image
                              src={post.mediaUrl}
                              alt="Post media"
                              width={800}
                              height={192}
                              className="w-full h-48 object-cover rounded-sm"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
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

        {activeTab === 'eventos' && (
          <div className="p-0 sm:p-0">
            <h3 className="text-white text-base sm:text-lg font-semibold mb-4">Eventos guardados</h3>

            {eventsLoading ? (
              <div className="text-center py-12">
                <p className="text-riff-text-secondary text-sm">Cargando eventos...</p>
              </div>
            ) : eventsError ? (
              <div className="text-center py-12">
                <p className="text-red-400 text-sm">{eventsError}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <BsCalendarEventFill className="w-12 h-12 text-riff-text-secondary mx-auto mb-4" />
                    <p className="text-riff-text-secondary text-sm">No tienes eventos guardados</p>
                  </div>
                ) : (
                  savedEvents.map((savedEvent) => {
                    const event = savedEvent.event;
                    if (!event) return null;

                    return (
                      <div key={savedEvent.id} className="bg-riff-header border border-white/10 rounded-sm p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold text-base mb-3">{event.title}</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-white text-sm">
                                <span className="truncate">{event.location}</span>
                              </div>
                              <div className="flex items-center gap-2 text-white text-sm">
                                <span>{formatEventDate(event.startDate.split('T')[0])}</span>
                              </div>
                              {event.description && (
                                <p className="text-riff-text-secondary text-xs mt-2">{event.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <button
                              onClick={() => handleUnsaveEvent(savedEvent.id)}
                              className={`px-4 py-2 rounded-sm font-medium text-sm transition-all duration-200 flex items-center gap-2 flex-shrink-0 ${
                                undoMessage?.type === 'event' && undoMessage?.id === savedEvent.id
                                  ? 'bg-riff-text-secondary/30 text-riff-text-secondary hover:bg-riff-text-secondary/40'
                                  : 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white hover:from-yellow-700 hover:to-yellow-600'
                              }`}
                            >
                              {undoMessage?.type === 'event' && undoMessage?.id === savedEvent.id ? (
                                <>
                                  <MdBookmarkBorder className="w-4 h-4" />
                                  <span>Eliminando...</span>
                                </>
                              ) : (
                                <>
                                  <MdBookmark className="w-4 h-4" />
                                  <span>Guardado</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Undo Message */}
      {undoMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-riff-text-primary border border-white/20 rounded-sm px-4 py-3 flex items-center gap-3 shadow-lg z-50">
          <span className="text-white text-sm">
            {undoMessage.type === 'publication' ? 'Publicación eliminada' : 'Evento eliminado'}
          </span>
          <button
            onClick={undoRemoval}
            className="text-riff-primary hover:text-riff-primary/80 text-sm font-medium transition-colors"
          >
            Deshacer
          </button>
        </div>
      )}
    </div>
  );
}