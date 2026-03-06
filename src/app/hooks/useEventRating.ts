'use client';

import { useState, useEffect } from 'react';

interface AttendedEvent {
  id: number;
  title: string;
  date: string;
  time: string;
}

interface EventToRate {
  id: number;
  title: string;
  date: string;
}

export function useEventRating(attendedEvents: AttendedEvent[]) {
  const [eventToRate, setEventToRate] = useState<EventToRate | null>(null);

  useEffect(() => {
    // Get rated events from localStorage
    const getRatedEvents = (): number[] => {
      if (typeof window === 'undefined') return [];
      const stored = localStorage.getItem('ratedEvents');
      return stored ? JSON.parse(stored) : [];
    };

    const ratedEventIds = getRatedEvents();

    // Check for events that need rating
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const eventNeedingRating = attendedEvents.find(event => {
      // Skip if already rated
      if (ratedEventIds.includes(event.id)) return false;

      // Parse event date (without time to compare only dates)
      const [year, month, day] = event.date.split('-').map(Number);
      const eventDate = new Date(year, month - 1, day);
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
      
      // Check if event was yesterday (comparing only dates)
      const eventWasYesterday = eventDate.getTime() === yesterdayDate.getTime();

      return eventWasYesterday;
    });

    if (eventNeedingRating) {
      setEventToRate({
        id: eventNeedingRating.id,
        title: eventNeedingRating.title,
        date: formatDate(eventNeedingRating.date)
      });
    }
  }, [attendedEvents]);

  const handleRatingSubmit = (eventId: number, rating: number, comment: string) => {
    // Save rating (in production, this would be an API call)
    console.log('Rating submitted:', { eventId, rating, comment });

    // Mark event as rated in localStorage
    if (typeof window !== 'undefined') {
      const ratedEvents = localStorage.getItem('ratedEvents');
      const currentRated = ratedEvents ? JSON.parse(ratedEvents) : [];
      localStorage.setItem('ratedEvents', JSON.stringify([...currentRated, eventId]));
    }

    // Close modal
    setEventToRate(null);
  };

  const handleRatingClose = () => {
    setEventToRate(null);
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return {
    eventToRate,
    handleRatingSubmit,
    handleRatingClose
  };
}
