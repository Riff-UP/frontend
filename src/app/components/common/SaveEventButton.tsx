'use client';

import { useState } from 'react';
import { MdBookmark, MdBookmarkBorder } from 'react-icons/md';
import { useSavedEvents } from '@/app/hooks/useSavedEvents';

interface SaveEventButtonProps {
  eventId: string;
  userId: string;
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
}

export default function SaveEventButton({
  eventId,
  userId,
  className = '',
  showCount = false,
  size = 'md',
  variant = 'icon'
}: SaveEventButtonProps) {
  const { savedEvents, saveEvent, unsaveEvent, isEventSaved } = useSavedEvents(userId);
  const [isLoading, setIsLoading] = useState(false);

  const isSaved = isEventSaved(eventId);
  const savedEvent = savedEvents.find(se => se.eventId === eventId);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isLoading) return;

    setIsLoading(true);

    try {
      if (isSaved && savedEvent) {
        await unsaveEvent(savedEvent.id);
      } else {
        await saveEvent(eventId, userId);
      }
    } catch (error) {
      console.error('Error toggling save event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleToggleSave}
        disabled={isLoading}
        className={`px-4 py-2 rounded-sm font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
          isSaved 
            ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white hover:from-yellow-700 hover:to-yellow-600' 
            : 'bg-riff-text-secondary/30 text-riff-text-secondary hover:bg-riff-text-secondary/40 hover:text-white'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {isSaved ? (
          <>
            <MdBookmark className="w-4 h-4" />
            <span>Guardado</span>
          </>
        ) : (
          <>
            <MdBookmarkBorder className="w-4 h-4" />
            <span>Guardar</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleSave}
      disabled={isLoading}
      className={`flex items-center gap-2 transition-colors ${
        isSaved 
          ? 'text-yellow-400 hover:text-yellow-300' 
          : 'text-riff-text-secondary hover:text-yellow-400'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      title={isSaved ? 'Quitar de guardados' : 'Guardar evento'}
    >
      {isSaved ? (
        <MdBookmark className={sizeClasses[size]} />
      ) : (
        <MdBookmarkBorder className={sizeClasses[size]} />
      )}
      {showCount && (
        <span className="text-xs">{savedEvents.filter(se => se.eventId === eventId).length}</span>
      )}
    </button>
  );
}

