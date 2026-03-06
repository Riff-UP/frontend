'use client';

import { useState, useEffect } from 'react';
import { FaMusic } from "react-icons/fa";
import Calendar from './common/Calendar';
import { ArtistData, Publication } from '@/app/types';
import ArtistInfo from './profile/ArtistInfo';
import PublicationCard from './publications/PublicationCard';
import PublicationModal from './publications/PublicationModal';
import EventCard from './events/EventCard';
import { useSavedPostsContext } from '@/app/context/SavedPostsContext';
import { useUser } from '@/app/hooks/useUser';
import { useFollow } from '@/app/hooks/useFollow';
import { usePublicArtistData } from '@/app/hooks/usePublicArtistData';
import { usePostReactions } from '@/app/hooks/usePostReactions';

interface ArtistProfileProps {
  artist?: ArtistData;
}

export default function ArtistProfile({ artist }: ArtistProfileProps) {
  const [activeTab, setActiveTab] = useState<'canciones' | 'publicaciones' | 'eventos'>('publicaciones');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const artistData = artist;
  const { user } = useUser();
  const { savedPosts, savePost, unsavePost, isPostSaved } = useSavedPostsContext();
  const { isFollowing, toggleFollow, loading: followLoading } = useFollow(user?.id);
  const {
    posts: rawPosts,
    events,
    loadingPosts,
    loadingEvents,
    followersCount,
    refreshFollowers,
  } = usePublicArtistData(artistData?.id);
  const { isLiked, toggleLike, reactedPosts, fetchPostReactionCounts, postReactionCounts, getReactionCount } =
    usePostReactions(user?.id);

  // Forzar re-render cuando savedPosts cambia
  const [, forceUpdate] = useState({});
  useEffect(() => { forceUpdate({}); }, [savedPosts]);

  // Cargar conteo de reacciones cuando llegan los posts
  useEffect(() => {
    const ids = rawPosts.map(p => String(p.id)).filter(Boolean);
    if (ids.length > 0) fetchPostReactionCounts(ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPosts]);

  if (!artistData) {
    return (
      <div className="min-h-screen bg-riff-text-primary flex items-center justify-center">
        <p className="text-white">No se encontró información del artista</p>
      </div>
    );
  }

  // Enriquecer posts con estado de like/save real
  const publications: Publication[] = rawPosts.map(p => {
    const postId = String(p.id);
    const hasServerCount = postReactionCounts.has(postId);
    const baseLikes = hasServerCount ? getReactionCount(postId) : (p.likes ?? 0);
    return {
      ...p,
      likes: baseLikes,
      isLiked: isLiked(postId),
      reactionId: reactedPosts.get(postId),
      isSaved: isPostSaved(postId),
    };
  });

  const handleLike = async (publicationId: string | number) => {
    if (!user) { alert('Debes iniciar sesión para reaccionar'); return; }
    await toggleLike(String(publicationId));
  };

  const handleSave = async (publicationId: string | number) => {
    if (isProcessing) return;
    if (!user) { alert('Debes iniciar sesión para guardar publicaciones'); return; }
    const postIdStr = String(publicationId);
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
    } catch (error) {
      console.error('Error al guardar/quitar guardado:', error);
    } finally {
      setIsProcessing(false);
      setSavingPostId(null);
      forceUpdate({});
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const hasEventOnDate = (day: number) =>
    events.some(event => {
      const [year, month, dayOfMonth] = event.date.split('-').map(Number);
      return dayOfMonth === day && month - 1 === currentMonth && year === currentYear;
    });

  // Contador local de seguidores para actualizar optimísticamente
  const [localFollowersCount, setLocalFollowersCount] = useState<number | undefined>(undefined);

  // Sincronizar con el valor real del backend cuando llega
  useEffect(() => {
    if (followersCount !== undefined) {
      setLocalFollowersCount(followersCount);
    }
  }, [followersCount]);

  const handleToggleFollow = async () => {
    const alreadyFollowing = isFollowing(artistData.id);
    // Actualización optimista del contador
    setLocalFollowersCount(prev => {
      const current = prev ?? 0;
      return alreadyFollowing ? Math.max(0, current - 1) : current + 1;
    });
    const ok = await toggleFollow(artistData.id);
    if (!ok) {
      // Revertir si falló
      setLocalFollowersCount(prev => {
        const current = prev ?? 0;
        return alreadyFollowing ? current + 1 : Math.max(0, current - 1);
      });
    } else {
      // Refrescar el conteo real desde el backend
      await refreshFollowers();
    }
  };

  const formatEventDate = (dateString: string, timeString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      const formatted = d.toLocaleDateString('es-MX');
      return timeString ? `${formatted} • ${timeString}` : formatted;
    }
    return dateString;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('es-MX');
    return dateString;
  };

  // Mostrar el contador real de seguidores si está disponible
  const artistWithFollowers: ArtistData = {
    ...artistData,
    followers: localFollowersCount ?? followersCount ?? artistData.followers,
  };

  const isSelf = user?.id === artistData.id;
  const isAuth = !!user;

  const tabs = [
    { id: 'canciones' as const, label: 'Canciones' },
    { id: 'publicaciones' as const, label: 'Publicaciones' },
    { id: 'eventos' as const, label: 'Eventos' },
  ];

  return (
    <div className="min-h-screen bg-riff-text-primary">
      {/* Cover Image Header */}
      <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, #212121 0%, #212121 10%, rgba(33, 33, 33, 0.8) 20%, rgba(33, 33, 33, 0) 60%)`,
          }}
        />
        <div
          className="w-full h-full bg-cover bg-center bg-riff-primary/10"
          style={{ backgroundImage: artistData.coverImage ? `url('${artistData.coverImage}')` : undefined }}
        />

        <div className="absolute top-0 left-0 right-0 p-3 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4">
            <ArtistInfo artist={artistWithFollowers} />
          </div>

          {/* Botón seguir — solo si no es el propio perfil y está autenticado */}
          {isAuth && !isSelf && (
            <div className="mt-2">
              <button
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`px-6 py-2 rounded-sm text-sm font-medium transition-all duration-200 ${
                  isFollowing(artistData.id)
                    ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                    : 'bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white hover:opacity-90'
                } ${followLoading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {followLoading ? '...' : isFollowing(artistData.id) ? 'Siguiendo' : 'Seguir'}
              </button>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-2 sm:px-4 lg:px-8">
          <div className="flex justify-start space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 relative whitespace-nowrap ${
                  activeTab === tab.id ? 'text-riff-primary' : 'text-white/80 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-riff-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        {activeTab === 'canciones' && (
          <div className="text-center py-20">
            <FaMusic className="w-12 h-12 text-riff-text-secondary mx-auto mb-4" />
            <p className="text-riff-text-secondary text-sm">Sección de música - Próximamente</p>
          </div>
        )}

        {activeTab === 'publicaciones' && (
          <div>
            {loadingPosts ? (
              <div className="flex justify-center py-16">
                <svg className="animate-spin h-7 w-7 text-riff-primary" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : publications.length === 0 ? (
              <p className="text-riff-text-secondary text-sm text-center py-12">
                Este artista no tiene publicaciones aún.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
                {publications.map(publication => {
                  const postId = String(publication.id);
                  return (
                    <PublicationCard
                      key={publication.id}
                      publication={{ ...publication, isSaved: isPostSaved(postId) }}
                      authorName={artistData.name}
                      isSaving={savingPostId === postId}
                      onLike={handleLike}
                      onSave={handleSave}
                      onClick={setSelectedPublication}
                      formatDate={formatDate}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'eventos' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="w-full lg:w-90 space-y-6">
                <Calendar
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onMonthChange={setCurrentMonth}
                  onYearChange={setCurrentYear}
                  hasEventOnDate={hasEventOnDate}
                />
              </div>

              <div className="flex-1">
                <h2 className="text-white text-base sm:text-lg font-normal mb-4">Próximos eventos</h2>
                {loadingEvents ? (
                  <div className="flex justify-center py-8">
                    <svg className="animate-spin h-6 w-6 text-riff-primary" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : events.length === 0 ? (
                  <p className="text-riff-text-secondary text-sm text-center py-8">
                    Este artista no tiene eventos próximos.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {events.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        formatDate={formatEventDate}
                        showAttendButton={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <PublicationModal
        publication={selectedPublication ? {
          ...selectedPublication,
          isSaved: isPostSaved(String(selectedPublication.id))
        } : null}
        authorName={artistData.name}
        isSaving={selectedPublication ? savingPostId === String(selectedPublication.id) : false}
        onClose={() => setSelectedPublication(null)}
        onLike={handleLike}
        onSave={handleSave}
        formatDate={formatDate}
      />
    </div>
  );
}