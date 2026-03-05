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
  userId: string;
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

      // El backend obtiene el userId del JWT, no enviar como query param
      const url = `${API_URL}/events`;

      // Construir headers con el token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Solo inyectar Authorization si hay token
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

      console.log('POST /events - Payload:', data);

      const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        console.error('Error del backend:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData
        });
        throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
      }

      const newEvent = await res.json();
      console.log('Evento creado exitosamente:', newEvent);
      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear evento';
      console.error('Error en createEvent:', err);
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