'use client';

import { useState, useEffect, useCallback } from 'react';
import { Event } from '@/app/types';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

interface EventFromBackend {
  _id: string;
  sql_user_id?: string;
  organizerId?: string;
  title: string;
  description?: string;
  event_date: string;
  location: string;
}

const API_URL = API_BASE_URL;

export function useArtistEvents(artistId: string) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!artistId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/events`, {
        headers: getAuthHeaders(false),
      });

      if (!res.ok) throw new Error('Error al obtener eventos');

      const data = await res.json();
      const rawEvents: EventFromBackend[] = data.data || data || [];

      const mapped: Event[] = rawEvents
        .filter(e => String(e.sql_user_id ?? e.organizerId ?? '') === artistId)
        .map(e => {
          const dateTime = new Date(e.event_date);
          return {
            id: e._id,
            title: e.title,
            location: e.location,
            date: e.event_date.split('T')[0],
            time: dateTime.toTimeString().slice(0, 5),
            description: e.description,
          };
        });

      setEvents(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refreshEvents: fetchEvents };
}