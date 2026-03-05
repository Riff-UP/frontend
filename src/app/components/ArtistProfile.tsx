'use client';

import { useState, useEffect } from 'react';
import { FaMusic } from "react-icons/fa";
import Calendar from './common/Calendar';
import { ArtistData, Publication } from '@/app/types';
import ArtistInfo from './profile/ArtistInfo';
import PublicationCard from './publications/PublicationCard';
import PublicationModal from './publications/PublicationModal';
import EventCard from './events/EventCard';
import { useArtistEvents } from '@/app/hooks/useArtistEvents';
import { useSavedPosts } from '@/app/hooks/useSavedPosts';
import { useUser } from '@/app/hooks/useUser';

interface ArtistProfileProps {
  artist?: ArtistData;
}

export default function ArtistProfile({ artist }: ArtistProfileProps) {
  const [activeTab, setActiveTab] = useState<'canciones' | 'publicaciones' | 'eventos'>('publicaciones');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Lock para evitar múltiples requests

  const artistData = artist;
  const { user } = useUser();
  const { savedPosts, savePost, unsavePost, isPostSaved } = useSavedPosts(user?.id);

  // ⚠️ DESHABILITADO: El backend no tiene endpoint para obtener eventos de otro artista
  // const { events, loading: eventsLoading } = useArtistEvents(artistData?.id?.toString() ?? '');
  const events: any[] = []; // Lista vacía por ahora
  const eventsLoading = false;

  // Forzar re-render cuando savedPosts cambia
  const [, forceUpdate] = useState({});
  useEffect(() => {
    forceUpdate({});
  }, [savedPosts]);

  if (!artistData) {
    return (
      <div className="min-h-screen bg-riff-text-primary flex items-center justify-center">
        <p className="text-white">No se encontró información del artista</p>
      </div>
    );
  }

  const handleLike = (publicationId: string | number) => {
    setPublications(pubs =>
      pubs.map(pub =>
        pub.id === publicationId
          ? {
              ...pub,
              isLiked: !pub.isLiked,
              likes: pub.isLiked ? pub.likes - 1 : pub.likes + 1,
            }
          : pub
      )
    );
  };

  const handleSave = async (publicationId: string | number) => {
    // Evitar múltiples requests simultáneos
    if (isProcessing) {
      console.log('⏸️ Ya hay una operación en proceso, ignorando click');
      return;
    }

    if (!user) {
      alert('Debes iniciar sesión para guardar publicaciones');
      return;
    }

    const postIdStr = String(publicationId);

    if (!postIdStr || postIdStr === 'undefined' || postIdStr === 'null') {
      console.error('ID de post inválido:', publicationId);
      return;
    }

    console.log('🔖 Intentando guardar/quitar post:', postIdStr);
    console.log('📋 Posts guardados actuales:', savedPosts);

    // Activar lock
    setIsProcessing(true);
    setSavingPostId(postIdStr);

    try {
      const savedPost = savedPosts.find(sp => sp.postId === postIdStr);
      console.log('🔍 Post ya guardado?:', savedPost ? 'SÍ' : 'NO');

      if (savedPost) {
        console.log('❌ Quitando de guardados, ID:', savedPost.id);
        // Pequeño delay para asegurar consistencia con el backend
        await new Promise(resolve => setTimeout(resolve, 100));
        const success = await unsavePost(savedPost.id);
        console.log('✅ Resultado unsave:', success);
      } else {
        console.log('➕ Guardando nuevo post');
        const result = await savePost(postIdStr, user.id);
        console.log('✅ Resultado save:', result);
      }
    } catch (error) {
      console.error('💥 Error al guardar/quitar guardado:', error);
    } finally {
      // Limpiar lock
      setIsProcessing(false);
      setSavingPostId(null);
      // Forzar actualización
      forceUpdate({});
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const hasEventOnDate = (day: number) => {
    return events.some(event => {
      const [year, month, dayOfMonth] = event.date.split('-').map(Number);
      return (
        dayOfMonth === day &&
        month - 1 === currentMonth &&
        year === currentYear
      );
    });
  };

  const formatEventDate = (dateString: string, timeString?: string) => {
    const [year, month, day] = dateString.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    return timeString ? `${formattedDate} • ${timeString}` : formattedDate;
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

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
          style={{
            backgroundImage: artistData.coverImage
              ? `url('${artistData.coverImage}')`
              : undefined,
          }}
        />

        <div className="absolute top-0 left-0 right-0 p-3 sm:p-6 lg:p-8">
          <ArtistInfo artist={artistData} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-2 sm:px-4 lg:px-8">
          <div className="flex justify-start space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-riff-primary'
                    : 'text-white/80 hover:text-white'
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
            {publications.length === 0 ? (
              <p className="text-riff-text-secondary text-sm text-center py-12">
                Este artista no tiene publicaciones aún.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
                {publications.map(publication => {
                  const postId = String(publication.id);
                  const isSaved = isPostSaved(postId);
                  console.log(`📝 Post ${postId}:`, { isSaved, savedPosts: savedPosts.length });

                  return (
                    <PublicationCard
                      key={publication.id}
                      publication={{
                        ...publication,
                        isSaved: isSaved
                      }}
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
                {eventsLoading ? (
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