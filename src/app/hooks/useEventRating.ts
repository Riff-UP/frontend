'use client';

import { useMemo } from 'react';

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
  const eventToRate = useMemo<EventToRate | null>(() => {
    const getRatedEvents = (): number[] => {
      if (typeof window === 'undefined') return [];
      const stored = localStorage.getItem('ratedEvents');
      return stored ? JSON.parse(stored) : [];
    };

    const ratedEventIds = getRatedEvents();
    const now = new Date();

    const eventNeedingRating = attendedEvents.find(event => {
      if (ratedEventIds.includes(event.id)) return false;

      const [year, month, day] = event.date.split('-').map(Number);
      const eventDate = new Date(year, month - 1, day);
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);

      return eventDate.getTime() === yesterdayDate.getTime();
    });

    if (!eventNeedingRating) {
      return null;
    }

    const [year, month, day] = eventNeedingRating.date.split('-');
    return {
      id: eventNeedingRating.id,
      title: eventNeedingRating.title,
      date: `${day}/${month}/${year}`,
    };
  }, [attendedEvents]);

  const handleRatingSubmit = (eventId: number, rating: number, comment: string) => {
    void rating;
    void comment;

    if (typeof window !== 'undefined') {
      const ratedEvents = localStorage.getItem('ratedEvents');
      const currentRated = ratedEvents ? JSON.parse(ratedEvents) : [];
      localStorage.setItem('ratedEvents', JSON.stringify([...currentRated, eventId]));
    }
  };

  const handleRatingClose = () => {};

  return {
    eventToRate,
    handleRatingSubmit,
    handleRatingClose
  };
}
