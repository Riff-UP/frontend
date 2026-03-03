'use client';

import { useState, useEffect, useCallback } from 'react';

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

const API_URL = 'http://localhost:4000/api';

// 👇 1. Mantenemos el parámetro opcional userId
export function useEvents(userId?: string): UseEventsReturn {
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

      // 👇 2. Construimos la URL dependiendo de si recibimos un userId
      const url = userId 
        ? `${API_URL}/events?userId=${userId}` 
        : `${API_URL}/events`;

      // 👇 3. Construimos los headers dinámicamente para no enviar "Bearer null"
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Solo inyectamos el Authorization si realmente hay un token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al obtener eventos');
      }

      const data = await res.json();
      setEvents(data.data || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [userId]); 

  const createEvent = async (data: CreateEventData): Promise<EventData | null> => {
    const token = getToken();

    if (!token) {
      setError('No hay sesión activa');
      return null;
    }

    try {
      setError(null);

      const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al crear evento');
      }

      const newEvent = await res.json();
      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear evento');
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