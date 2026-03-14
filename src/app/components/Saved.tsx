'use client';

import { useEffect, useState } from 'react';
import { MdBookmark } from 'react-icons/md';
import { FiCalendar, FiMapPin } from 'react-icons/fi';
import TabNavigation from './common/TabNavigation';
import { useSavedPostsContext } from '../context/SavedPostsContext';
import { useUser } from '../hooks/useUser';
import { useEventAttendance } from '../hooks/useEventAttendance';
import { API_BASE_URL } from '../config/api';
import Image from 'next/image';

const API_URL = API_BASE_URL;

interface SavedEventItem {
  id: string;
  title: string;
  location: string;
  eventDate: string;
  description: string;
}

function resolveEventId(event: Record<string, unknown>): string {
  const raw = event._id ?? event.id;
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null && '$oid' in raw) {
    return String((raw as { $oid: string }).$oid);
  }
  return String(raw);
}

export default function Saved() {
  const [activeTab, setActiveTab] = useState<'publicaciones' | 'eventos'>('publicaciones');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingAttendanceId, setRemovingAttendanceId] = useState<string | null>(null);
  const [savedEvents, setSavedEvents] = useState<SavedEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const { user } = useUser();
  const { attendedEvents, unattend, loading: attendanceLoading } = useEventAttendance(user?.id);
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

  const handleRemoveAttendance = async (eventId: string) => {
    if (!eventId || removingAttendanceId || attendanceLoading) return;
    setRemovingAttendanceId(eventId);
    try {
      const success = await unattend(eventId);
      if (success) {
        setSavedEvents((prev) => prev.filter((event) => event.id !== eventId));
      }
    } finally {
      setRemovingAttendanceId(null);
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
    { id: 'eventos' as const, label: 'Eventos'},
  ];

  useEffect(() => {
    const loadAttendedEvents = async () => {
      if (!user?.id) {
        setSavedEvents([]);
        return;
      }

      const attendedIds = new Set(Array.from(attendedEvents.keys()));
      if (attendedIds.size === 0) {
        setSavedEvents([]);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setSavedEvents([]);
        return;
      }

      setEventsLoading(true);
      try {
        const res = await fetch(`${API_URL}/events`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          setSavedEvents([]);
          return;
        }

        const data = await res.json();
        const allEvents: Record<string, unknown>[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];

        const mapped = allEvents
          .map((event) => {
            const id = resolveEventId(event);
            return {
              id,
              title: String(event.title ?? 'Evento sin título'),
              location: String(event.location ?? 'Sin ubicación'),
              eventDate: String(event.event_date ?? event.eventDate ?? ''),
              description: String(event.description ?? event.details ?? ''),
            };
          })
          .filter((event) => event.id && attendedIds.has(event.id));

        setSavedEvents(mapped);
      } catch {
        setSavedEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    void loadAttendedEvents();
  }, [attendedEvents, user?.id]);

  const formatEventDate = (dateString?: string) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-white text-xl sm:text-2xl font-bold">Guardados</h2>
        <p className="text-white/80 text-xs sm:text-sm mt-1">
          Accede a tus publicaciones y eventos con asistencia marcada.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'publicaciones' | 'eventos')}
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

        {activeTab === 'eventos' && (
          <div className="p-0 sm:p-0">
            <h3 className="text-white text-base sm:text-lg font-semibold mb-4">Eventos con asistencia</h3>

            {eventsLoading ? (
              <div className="text-center py-12">
                <p className="text-riff-text-secondary text-sm">Cargando eventos...</p>
              </div>
            ) : savedEvents.length === 0 ? (
              <div className="text-center py-12">
                <FiCalendar className="w-12 h-12 text-riff-text-secondary mx-auto mb-4" />
                <p className="text-riff-text-secondary text-sm">No tienes eventos con asistencia marcada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedEvents.map((event) => {
                  const isRemovingAttendance = removingAttendanceId === event.id;

                  return (
                    <div key={event.id} className={`bg-riff-header rounded-sm p-4 transition-opacity ${isRemovingAttendance ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-sm sm:text-base">{event.title}</h4>

                          {event.description && (
                            <p className="mt-2 text-white/85 text-xs sm:text-sm leading-relaxed">
                              {event.description}
                            </p>
                          )}

                          <div className="mt-3 space-y-1.5 text-riff-text-secondary text-xs sm:text-sm">
                            <p className="flex items-center gap-2">
                              <FiCalendar className="w-4 h-4" />
                              {formatEventDate(event.eventDate)}
                            </p>
                            <p className="flex items-center gap-2">
                              <FiMapPin className="w-4 h-4" />
                              {event.location}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveAttendance(event.id)}
                          disabled={isRemovingAttendance || attendanceLoading}
                          className="self-center rounded-sm border border-white/20 px-3 py-1.5 text-xs sm:text-sm text-white/90 hover:bg-white/10 transition-colors disabled:opacity-50"
                          title="Quitar asistencia"
                        >
                          {isRemovingAttendance ? 'Quitando...' : 'Quitar asistencia'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}