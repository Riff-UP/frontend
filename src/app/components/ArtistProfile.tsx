'use client';

import { useState } from 'react';
import { FaMusic } from "react-icons/fa";
import Calendar from './common/Calendar';
import { ArtistData, Publication, Event } from '@/app/types';
import ArtistInfo from './profile/ArtistInfo';
import PublicationCard from './publications/PublicationCard';
import PublicationModal from './publications/PublicationModal';
import EventCard from './events/EventCard';

interface ArtistProfileProps {
  artist?: ArtistData;
}

export default function ArtistProfile({ artist }: ArtistProfileProps) {
  const [activeTab, setActiveTab] = useState<'canciones' | 'publicaciones' | 'eventos'>('publicaciones');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [savedCounts, setSavedCounts] = useState<{[key: number]: number}>({});
  const artistData = artist;
  const [publications, setPublications] = useState<Publication[]>([]);

  const [events, setEvents] = useState<Event[]>([]);

  if (!artistData) {
    return <div className="min-h-screen bg-riff-text-primary flex items-center justify-center">
      <p className="text-white">No se encontró información del artista</p>
    </div>;
  }

  const handleLike = (publicationId: number) => {
    setPublications(pubs => 
      pubs.map(pub => 
        pub.id === publicationId 
          ? { 
              ...pub, 
              isLiked: !pub.isLiked,
              likes: pub.isLiked ? pub.likes - 1 : pub.likes + 1
            }
          : pub
      )
    );
  };

  const handleSave = (publicationId: number) => {
    setPublications(pubs => 
      pubs.map(pub => 
        pub.id === publicationId 
          ? { ...pub, isSaved: !pub.isSaved }
          : pub
      )
    );
    
    // Update saved count
    setSavedCounts(counts => ({
      ...counts,
      [publicationId]: (counts[publicationId] || 0) + (publications.find(p => p.id === publicationId)?.isSaved ? -1 : 1)
    }));
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
      return dayOfMonth === day && 
             (month - 1) === currentMonth && 
             year === currentYear;
    });
  };

  const handleAttendEvent = (eventId: number) => {
    setEvents(evs => 
      evs.map(event => 
        event.id === eventId 
          ? { ...event, isAttending: !event.isAttending }
          : event
      )
    );
  };

  const formatEventDate = (dateString: string, timeString?: string) => {
    const [year, month, day] = dateString.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    if (timeString) {
      return `${formattedDate} • ${timeString}`;
    }
    return formattedDate;
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const tabs = [
    { id: 'canciones' as const, label: 'Canciones'},
    { id: 'publicaciones' as const, label: 'Publicaciones' },
    { id: 'eventos' as const, label: 'Eventos' }
  ];

  return (
    <div className="min-h-screen bg-riff-text-primary">
      {/* Cover Image Header */}
      <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
        {/* Custom gradient overlay */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: `linear-gradient(to right, #212121 0%, #212121 10%, rgba(33, 33, 33, 0.8) 20%, rgba(33, 33, 33, 0) 60%)` 
          }}
        ></div>
        <div 
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url('${artistData.coverImage}')` }}
        ></div>
        
        {/* Artist Info Overlay - Positioned higher */}
        <div className="absolute top-0 left-0 right-0 p-3 sm:p-6 lg:p-8">
          <ArtistInfo artist={artistData} />
        </div>

        {/* Navigation Tabs - Inside the image */}
        <div className="absolute bottom-0 left-0 right-0 px-2 sm:px-4 lg:px-8">
          <div className="flex justify-start space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              
              return (
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
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-riff-primary"></div>
                  )}
                </button>
              );
            })}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
              {publications.map((publication) => (
                <PublicationCard
                  key={publication.id}
                  publication={publication}
                  authorName={artistData.name}
                  savedCount={savedCounts[publication.id] || 0}
                  onLike={handleLike}
                  onSave={handleSave}
                  onClick={setSelectedPublication}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'eventos' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Calendar */}
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

              {/* Events - Original format */}
              <div className="flex-1">
                <h2 className="text-white text-base sm:text-lg font-normal mb-4">Próximos eventos</h2>
                <div className="space-y-4">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      formatDate={formatEventDate}
                      onAttend={handleAttendEvent}
                      showAttendButton={true}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Publication Detail Modal */}
      <PublicationModal
        publication={selectedPublication}
        authorName={artistData.name}
        savedCount={selectedPublication ? savedCounts[selectedPublication.id] || 0 : 0}
        onClose={() => setSelectedPublication(null)}
        onLike={handleLike}
        onSave={handleSave}
        formatDate={formatDate}
      />
    </div>
  );
}