'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [bannerIndex, setBannerIndex] = useState(0);

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

  // Imágenes del banner: coverImage primero, luego imágenes de publicaciones
  const bannerImages = useMemo(() => {
    const imgs: string[] = [];
    if (artistData?.coverImage) imgs.push(artistData.coverImage);
    rawPosts.forEach(p => { if (p.image) imgs.push(p.image); });
    return imgs;
  }, [artistData?.coverImage, rawPosts]);

  // Slideshow automático cada 4 segundos
  const advanceBanner = useCallback(() => {
    if (bannerImages.length > 1) {
      setBannerIndex(prev => (prev + 1) % bannerImages.length);
    }
  }, [bannerImages.length]);

  useEffect(() => {
    setBannerIndex(0); // resetear al entrar al perfil
  }, [artistData?.id]);

  useEffect(() => {
    if (bannerImages.length <= 1) return;
    const timer = setInterval(advanceBanner, 4000);
    return () => clearInterval(timer);
  }, [advanceBanner, bannerImages.length]);

  if (!artistData) {
    return (
      <div className="min-h-screen bg-riff-text-primary flex items-center justify-center">
        <p className="text-white">No se encontró información del artista</p>
      </div>
    );
  }

  // Enriquecer posts con estado de like/save real — useMemo para re-renderizar al cambiar likes/saves
  const publications: Publication[] = useMemo(() => rawPosts.map(p => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rawPosts, reactedPosts, postReactionCounts, savedPosts]);

  const handleLike = async (publicationId: string | number) => {
    if (!user) { alert('Debes iniciar sesión para reaccionar'); return; }
    await toggleLike(String(publicationId));
  };

  // selectedPublication siempre refleja el estado actualizado de likes/saves
  const liveSelectedPublication = useMemo(() => {
    if (!selectedPublication) return null;
    return publications.find(p => String(p.id) === String(selectedPublication.id)) ?? selectedPublication;
  }, [selectedPublication, publications]);

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
    } catch {
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

        {/* Slideshow de fondo: imágenes de publicaciones */}
        {bannerImages.length > 0 ? (
          bannerImages.map((img, i) => (
            <div
              key={img}
              className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000"
              style={{
                backgroundImage: `url('${img}')`,
                opacity: i === bannerIndex ? 1 : 0,
                zIndex: 0,
              }}
            />
          ))
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-riff-primary/20 to-riff-text-primary" />
        )}

        {/* Gradiente izquierda + oscurecimiento general */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background: `linear-gradient(to right, #212121 0%, #212121 5%, rgba(33,33,33,0.85) 25%, rgba(33,33,33,0.5) 60%, rgba(33,33,33,0.3) 100%), linear-gradient(to top, #212121 0%, rgba(33,33,33,0.4) 40%, transparent 100%)`,
          }}
        />

        {/* Indicadores del slideshow */}
        {bannerImages.length > 1 && (
          <div className="absolute bottom-12 right-4 z-20 flex gap-1.5">
            {bannerImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setBannerIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === bannerIndex ? 'bg-white w-4' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 p-3 sm:p-6 lg:p-8 z-20">
          <ArtistInfo
            artist={artistWithFollowers}
            followButton={isAuth && !isSelf ? (
              <button
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`px-5 py-1.5 rounded-sm text-xs sm:text-sm font-medium transition-all duration-200 ${
                  isFollowing(artistData.id)
                    ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                    : 'bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white hover:opacity-90'
                } ${followLoading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {followLoading ? '...' : isFollowing(artistData.id) ? 'Siguiendo' : 'Seguir'}
              </button>
            ) : null}
          />
          {/* Bio y redes sociales — dentro del cover, bajo ArtistInfo */}
          {(() => {
            const instagram = artistWithFollowers.socialMedia?.find(sm => sm.url.startsWith('instagram:'))?.url.slice('instagram:'.length) ?? null;
            const facebook = artistWithFollowers.socialMedia?.find(sm => sm.url.startsWith('facebook:'))?.url.slice('facebook:'.length) ?? null;
            const whatsapp = artistWithFollowers.socialMedia?.find(sm => sm.url.startsWith('whatsapp:'))?.url.slice('whatsapp:'.length) ?? null;
            const email = (artistWithFollowers as { email?: string }).email ?? null;
            const hasSocial = instagram || facebook || whatsapp || email;
            if (!artistWithFollowers.biography && !hasSocial) return null;

            const toInstagramUrl = (val: string) => {
              const user = val.startsWith('@') ? val.slice(1) : val;
              return `https://instagram.com/${user}`;
            };
            const toFacebookUrl = (val: string) => {
              if (val.startsWith('http')) return val;
              const user = val.startsWith('@') ? val.slice(1) : val;
              return `https://facebook.com/${user}`;
            };
            const toWhatsappUrl = (val: string) => {
              const num = val.replace(/\D/g, '');
              return `https://wa.me/${num}`;
            };

            return (
              <div className="mt-3 pl-0">
                {artistWithFollowers.biography && (
                  <p className="text-white/80 text-xs sm:text-sm leading-relaxed mb-2">{artistWithFollowers.biography}</p>
                )}
                {hasSocial && (
                  <div className="flex flex-col gap-y-1.5">
                    {instagram && (
                      <a href={toInstagramUrl(instagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-xs sm:text-sm">
                        <img src="/images/instagram.png" alt="Instagram" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{instagram}</span>
                      </a>
                    )}
                    {facebook && (
                      <a href={toFacebookUrl(facebook)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-xs sm:text-sm">
                        <img src="/images/facebook_n.png" alt="Facebook" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{facebook}</span>
                      </a>
                    )}
                    {whatsapp && (
                      <a href={toWhatsappUrl(whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-xs sm:text-sm">
                        <img src="/images/whatsapp.png" alt="WhatsApp" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{whatsapp}</span>
                      </a>
                    )}
                    {email && (
                      <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-xs sm:text-sm">
                        <img src="/images/gmail.png" alt="Gmail" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{email}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-2 sm:px-4 lg:px-8 z-20">
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
                      authorImage={artistData.profileImage}
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
        publication={liveSelectedPublication ? {
          ...liveSelectedPublication,
          isSaved: isPostSaved(String(liveSelectedPublication.id))
        } : null}
        authorName={artistData.name}
        authorImage={artistData.profileImage}
        isSaving={liveSelectedPublication ? savingPostId === String(liveSelectedPublication.id) : false}
        onClose={() => setSelectedPublication(null)}
        onLike={handleLike}
        onSave={handleSave}
        formatDate={formatDate}
      />
    </div>
  );
}