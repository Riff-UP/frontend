'use client';

import { useState } from 'react';
import { MdBookmark, MdBookmarkBorder } from 'react-icons/md';
import { LiaUserCheckSolid } from "react-icons/lia";
import { FaMusic } from "react-icons/fa";
import { BsCalendarEventFill } from "react-icons/bs";
import TabNavigation from './common/TabNavigation';
import EventCard from './events/EventCard';

interface SavedPublication {
  id: number;
  author: string;
  content: string;
  image?: string;
  date: string;
}

interface SavedEvent {
  id: number;
  title: string;
  location: string;
  date: string;
  time: string;
  attending: boolean;
}

export default function Saved() {
  const [activeTab, setActiveTab] = useState<'publicaciones' | 'canciones' | 'eventos'>('publicaciones');
  const [undoMessage, setUndoMessage] = useState<{type: 'publication' | 'event', id: number, item: any} | null>(null);

  // Mock data for saved publications
  const [savedPublications, setSavedPublications] = useState<SavedPublication[]>([]);

  // Mock data for events attending
  const [eventsAttending, setEventsAttending] = useState<SavedEvent[]>([]);

  const toggleAttendance = (eventId: number) => {
    const event = eventsAttending.find(e => e.id === eventId);
    if (event && event.attending) {
      // Mostrar mensaje de deshacer antes de eliminar
      setUndoMessage({type: 'event', id: eventId, item: event});
      // Eliminar después de 2 segundos si no se deshace
      setTimeout(() => {
        setUndoMessage(current => {
          if (current?.type === 'event' && current?.id === eventId) {
            setEventsAttending(events => events.filter(e => e.id !== eventId));
            return null;
          }
          return current;
        });
      }, 2000);
    } else {
      // Si no está asistiendo, marcar como asistiendo
      setEventsAttending(events => 
        events.map(event => 
          event.id === eventId 
            ? { ...event, attending: true }
            : event
        )
      );
    }
  };

  const removeSavedPublication = (publicationId: number) => {
    const publication = savedPublications.find(p => p.id === publicationId);
    if (publication) {
      // Mostrar mensaje de deshacer antes de eliminar
      setUndoMessage({type: 'publication', id: publicationId, item: publication});
      // Eliminar después de 2 segundos si no se deshace
      setTimeout(() => {
        setUndoMessage(current => {
          if (current?.type === 'publication' && current?.id === publicationId) {
            setSavedPublications(publications => 
              publications.filter(p => p.id !== publicationId)
            );
            return null;
          }
          return current;
        });
      }, 2000);
    }
  };

  const undoRemoval = () => {
    if (undoMessage) {
      if (undoMessage.type === 'event') {
        // Restaurar evento (ya está en la lista, no hacer nada)
      } else if (undoMessage.type === 'publication') {
        // Restaurar publicación (ya está en la lista, no hacer nada)
      }
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
            <div className="space-y-4">
              {savedPublications.length === 0 ? (
                <div className="text-center py-12">
                  <MdBookmark className="w-12 h-12 text-riff-text-secondary mx-auto mb-4" />
                  <p className="text-riff-text-secondary text-sm">No tienes publicaciones guardadas</p>
                </div>
              ) : (
                savedPublications.map((publication) => (
                  <div key={publication.id} className="bg-riff-header rounded-sm p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 bg-gradient-to-br from-riff-primary-dark to-riff-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">{publication.author.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold text-sm">{publication.author}</span>
                            <span className="text-riff-text-secondary text-xs">
                              {formatEventDate(publication.date)}
                            </span>
                          </div>
                          <p className="text-white text-sm leading-relaxed">{publication.content}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeSavedPublication(publication.id)}
                        className={`transition-colors flex-shrink-0 ${
                          undoMessage?.type === 'publication' && undoMessage?.id === publication.id
                            ? 'text-riff-text-secondary hover:text-riff-text-secondary/80'
                            : 'text-yellow-400 hover:text-yellow-300'
                        }`}
                      >
                        {undoMessage?.type === 'publication' && undoMessage?.id === publication.id ? (
                          <MdBookmarkBorder className="w-5 h-5" />
                        ) : (
                          <MdBookmark className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {publication.image && (
                      <div className="mt-3">
                        <div className="w-full h-48 bg-riff-text-header rounded-sm flex items-center justify-center">
                          <span className="text-riff-text-secondary text-sm">Imagen del evento</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
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
            <h3 className="text-white text-base sm:text-lg font-semibold mb-4">Eventos a los que asistiré</h3>
            <div className="space-y-4">
              {eventsAttending.length === 0 ? (
                <div className="text-center py-12">
                    <BsCalendarEventFill className="w-12 h-12 text-riff-text-secondary mx-auto mb-4" />
                  <p className="text-riff-text-secondary text-sm">No tienes eventos programados</p>
                </div>
              ) : (
                eventsAttending.map((event) => (
                  <div key={event.id} className="bg-riff-header border border-white/10 rounded-sm p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-base mb-3">{event.title}</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-white text-sm">
                            
                            <span className="truncate">{event.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-white text-sm">
                            <span>{formatEventDate(event.date, event.time)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleAttendance(event.id)}
                          className={`px-4 py-2 rounded-sm font-medium text-sm transition-all duration-200 flex items-center gap-2 flex-shrink-0 ${
                            undoMessage?.type === 'event' && undoMessage?.id === event.id
                              ? 'bg-riff-text-secondary/30 text-riff-text-secondary hover:bg-riff-text-secondary/40 hover:text-white'
                              : event.attending
                                ? 'bg-gradient-to-r from-green-600 to-green-500 text-white'
                                : 'bg-riff-text-secondary/30 text-riff-text-secondary hover:bg-riff-text-secondary/40 hover:text-white'
                          }`}
                        >
                          {undoMessage?.type === 'event' && undoMessage?.id === event.id ? (
                            <span>No asistiré</span>
                          ) : event.attending ? (
                            <>
                              <LiaUserCheckSolid className="w-4 h-4" />
                              <span>Asistiré</span>
                            </>
                          ) : (
                            <span>Marcar asistencia</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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