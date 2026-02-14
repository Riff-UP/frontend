'use client';

import { useState } from 'react';
import { FiMapPin, FiHeart } from 'react-icons/fi';
import { MdCheck, MdBookmark, MdBookmarkBorder } from 'react-icons/md';
import Image from 'next/image';
import { FaMusic } from "react-icons/fa";
import { BsCalendarEventFill } from "react-icons/bs";
import Calendar from './Calendar';
import { LiaUserCheckSolid } from "react-icons/lia";
import { IoMdClose } from 'react-icons/io';

interface ArtistData {
  id: number;
  name: string;
  followers: number;
  description: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  email: string;
  coverImage: string;
  profileImage?: string;
}

interface Publication {
  id: number;
  content: string;
  image?: string;
  date: string;
  likes: number;
  isLiked: boolean;
  isSaved: boolean;
}

interface Event {
  id: number;
  title: string;
  location: string;
  date: string;
  time: string;
  isAttending: boolean;
}

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
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-8">
            {artistData.profileImage && (
              <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-4 border-white/20 bg-riff-text-secondary/30 flex-shrink-0">
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url('${artistData.profileImage}')` }}
                ></div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">{artistData.name}</h1>
              <p className="text-white text-xs sm:text-base mb-2 sm:mb-3">{artistData.followers.toLocaleString()} seguidores</p>
              <p className="text-white text-xs sm:text-sm leading-relaxed max-w-lg mb-3 sm:mb-4 line-clamp-3 sm:line-clamp-none">
                {artistData.description}
              </p>
              
              {/* Social Media Icons - Vertical layout */}
              <div className="flex flex-col gap-1 sm:gap-2">
                {artistData.instagram && (
                  <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
                    <Image src="/images/instagram.png" alt="Instagram" width={14} height={14} className="sm:w-4 sm:h-4" />
                    <span className="truncate">{artistData.instagram}</span>
                  </div>
                )}
                {artistData.facebook && (
                  <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
                    <Image src="/images/facebook_n.png" alt="Facebook" width={14} height={14} className="sm:w-4 sm:h-4" />
                    <span className="truncate">{artistData.facebook}</span>
                  </div>
                )}
                {artistData.whatsapp && (
                  <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
                    <Image src="/images/whatsapp.png" alt="WhatsApp" width={14} height={14} className="sm:w-4 sm:h-4" />
                    <span className="truncate">{artistData.whatsapp}</span>
                  </div>
                )}
                {artistData.email && (
                  <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
                    <Image src="/images/gmail.png" alt="Gmail" width={14} height={14} className="sm:w-4 sm:h-4" />
                    <span className="truncate">{artistData.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
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
                <div 
                  key={publication.id} 
                  onClick={() => setSelectedPublication(publication)}
                  className="bg-riff-header rounded-sm overflow-hidden h-full flex flex-col cursor-pointer border border-transparent hover:border-riff-primary/50 transition-all"
                >
                  {/* Author Header */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-riff-primary-dark to-riff-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-medium">{artistData.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col gap-1">
                          <span className="text-white font-semibold text-base">{artistData.name}</span>
                          <span className="text-white text-xs">
                            {formatDate(publication.date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content with line clamping */}
                    <p className="text-white text-base leading-relaxed mb-3 line-clamp-4 flex-1">
                      {publication.content}
                    </p>

                    {publication.image && (
                      <div className="mb-3">
                        <div className="w-full h-40 bg-riff-header rounded-sm flex items-center justify-center">
                          <span className="text-riff-text-secondary text-sm">Imagen del evento</span>
                        </div>
                      </div>
                    )}

                    {/* Actions - Right aligned, always at bottom */}
                    <div className="flex items-center justify-end gap-4 mt-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(publication.id);
                        }}
                        className={`flex items-center gap-2 transition-colors ${
                          publication.isLiked ? 'text-red-400' : 'text-riff-text-secondary hover:text-red-400'
                        }`}
                      >
                        <FiHeart className={`w-6 h-6 ${publication.isLiked ? 'fill-current' : ''}`} />
                        <span className="text-xs">{publication.likes}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSave(publication.id);
                        }}
                        className={`flex items-center gap-2 transition-colors ${
                          publication.isSaved ? 'text-yellow-400' : 'text-riff-text-secondary hover:text-yellow-400'
                        }`}
                      >
                        {publication.isSaved ? (
                          <MdBookmark className="w-6 h-6" />
                        ) : (
                          <MdBookmarkBorder className="w-6 h-6" />
                        )}
                        <span className="text-xs">{savedCounts[publication.id] || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
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
                    <div key={event.id} className="bg-riff-header rounded-sm p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                        <div className="flex-1 w-full sm:w-auto">
                          <h3 className="text-white font-semibold text-base mb-3">{event.title}</h3>
                          <div className="space-y-2"> 
                            <div className="flex items-center gap-2 text-white/80">
                              <FiMapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/80">
                              <BsCalendarEventFill className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">{formatEventDate(event.date, event.time)}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAttendEvent(event.id)}
                          className={`w-full sm:w-auto px-6 py-2.5 rounded-sm font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                            event.isAttending
                              ? 'bg-gradient-to-r from-riff-save to-riff-save-2 text-white'
                              : 'bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white hover:from-riff-primary hover:to-riff-primary-dark'
                          }`}
                        >
                          {event.isAttending ? (
                            <>
                              <MdCheck className="w-4 h-4" />
                              <span>Asistir</span>
                            </>
                          ) : (
                            <>
                              <LiaUserCheckSolid className="w-5 h-5" />
                              <span>Asistir</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Publication Detail Modal */}
      {selectedPublication && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4"
          onClick={() => setSelectedPublication(null)}
        >
          <div 
            className="bg-riff-header rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6  sticky top-0 bg-riff-header z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-riff-primary-dark to-riff-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">{artistData.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base">{artistData.name}</h3>
                  <p className="text-white/60 text-xs">{formatDate(selectedPublication.date)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPublication(null)}
                className="text-riff-primary hover:text-riff-primary/80 transition-colors"
              >
                <IoMdClose className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6">
              {/* Image */}
              {selectedPublication.image && (
                <div className="mb-4">
                  <div className="w-full bg-riff-header rounded-sm overflow-hidden">
                    <div className="aspect-video flex items-center justify-center">
                      <span className="text-riff-text-secondary">Imagen del evento</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Content */}
              <div className="mb-6">
                <p className="text-white text-base leading-relaxed whitespace-pre-wrap">
                  {selectedPublication.content}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 ">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(selectedPublication.id);
                  }}
                  className={`flex items-center gap-2 transition-colors ${
                    selectedPublication.isLiked ? 'text-red-400' : 'text-riff-text-secondary hover:text-red-400'
                  }`}
                >
                  <FiHeart className={`w-6 h-6 ${selectedPublication.isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm">{selectedPublication.likes}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(selectedPublication.id);
                  }}
                  className={`flex items-center gap-2 transition-colors ${
                    selectedPublication.isSaved ? 'text-yellow-400' : 'text-riff-text-secondary hover:text-yellow-400'
                  }`}
                >
                  {selectedPublication.isSaved ? (
                    <MdBookmark className="w-6 h-6" />
                  ) : (
                    <MdBookmarkBorder className="w-6 h-6" />
                  )}
                  <span className="text-sm">{savedCounts[selectedPublication.id] || 0}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}