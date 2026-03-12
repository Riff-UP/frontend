'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

export interface EventData {
  _id: string;
  sql_user_id: string;
  title: string;
  description?: string;
  event_date: string;
  location: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  event_date: string;
  location: string;
  sql_user_id?: string; // El backend lo requiere en el DTO (aunque el controller lo inyecta del JWT)
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  event_date?: string;
  location?: string;
}

interface UseEventsReturn {
  events: EventData[];
  loading: boolean;
  error: string | null;
  createEvent: (data: CreateEventData) => Promise<EventData | null>;
  updateEvent: (id: string, data: UpdateEventData) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  refreshEvents: () => Promise<void>;
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const fetchEvents = useCallback(async () => {
    const token = getToken();

    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Extraer el userId del JWT para filtrar client-side
      let currentUserId: string | undefined;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            currentUserId = payload.id || payload.userId || payload.sub || undefined;
          }
        } catch { /* si falla el parse, no filtramos */ }
      }

      const res = await fetch(`${API_URL}/events`, { headers });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al obtener eventos');
      }

      const data = await res.json();
      const allEvents: EventData[] = data.data || data || [];

      // El endpoint /events devuelve todos los eventos. Filtramos por el usuario
      // actual para evitar mostrar eventos de otros usuarios en el perfil propio.
      const filtered = currentUserId
        ? allEvents.filter(e => String(e.sql_user_id) === currentUserId)
        : allEvents;

      setEvents(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const createEvent = async (data: CreateEventData): Promise<EventData | null> => {
    const token = getToken();

    if (!token) {
      setError('No hay sesión activa');
      return null;
    }

    try {
      setError(null);

      // Extraer userId del JWT para enviarlo como sql_user_id
      let sql_user_id: string | undefined;
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          sql_user_id = payload.id || payload.userId || payload.sub || undefined;
        }
      } catch {
      }

      const payload = { ...data, ...(sql_user_id ? { sql_user_id } : {}) };

      const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
      }

      const newEvent = await res.json();
      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear evento';
      setError(errorMessage);
      return null;
    }
  };

  const updateEvent = async (id: string, data: UpdateEventData): Promise<boolean> => {
    const token = getToken();

    if (!token) {
      setError('No hay sesión activa');
      return false;
    }

    try {
      setError(null);

      const res = await fetch(`${API_URL}/events/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al actualizar evento');
      }

      const updatedEvent = await res.json();
      setEvents(prev => prev.map(e => (e._id === id ? updatedEvent : e)));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar evento');
      return false;
    }
  };

  const deleteEvent = async (id: string): Promise<boolean> => {
    const token = getToken();

    if (!token) {
      setError('No hay sesión activa');
      return false;
    }

    try {
      setError(null);

      const res = await fetch(`${API_URL}/events/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al eliminar evento');
      }

      setEvents(prev => prev.filter(e => e._id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar evento');
      return false;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents: fetchEvents,
  };
}