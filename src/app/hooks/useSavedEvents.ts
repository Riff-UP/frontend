'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

export interface SavedEvent {
  id: string;
  eventId: string;
  userId: string;
  createdAt?: string;
  // Información del evento relacionado (puede venir populated desde el backend)
  event?: {
    id: string;
    organizerId: string;
    title: string;
    description?: string;
    location: string;
    startDate: string;
    endDate?: string;
    status?: string;
    maxCapacity?: number;
    currentAttendance?: number;
    ticketPrice?: number;
    imageUrl?: string;
    category?: string;
    tags?: string[];
  };
}

export interface CreateSavedEventData {
  eventId: string;
  userId: string;
}

interface UseSavedEventsReturn {
  savedEvents: SavedEvent[];
  loading: boolean;
  error: string | null;
  saveEvent: (eventId: string, userId: string) => Promise<SavedEvent | null>;
  unsaveEvent: (savedEventId: string) => Promise<boolean>;
  isEventSaved: (eventId: string) => boolean;
  refreshSavedEvents: () => Promise<void>;
}

export function useSavedEvents(userId?: string): UseSavedEventsReturn {
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const fetchSavedEvents = useCallback(async () => {
    // No hacer fetch si no hay userId
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // El backend obtiene el userId del JWT, no enviar como query param
      const url = `${API_URL}/events/saved`;

      const res = await fetch(url, { headers });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));

        // Si es error 500, no fallar completamente - solo log y continuar
        if (res.status === 500) {
          console.warn('⚠️ Backend con problemas (500) en eventos guardados, continuando con lista vacía');
          setSavedEvents([]); // Lista vacía en lugar de fallar
          setError(null); // No mostrar error al usuario
          return;
        }

        throw new Error(errorData.message || 'Error al obtener eventos guardados');
      }

      const data = await res.json();

      // Normalizar respuesta del backend
      const eventsArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      // Normalizar cada evento si es necesario
      const normalizedEvents = eventsArray.map((event: any) => ({
        id: event._id || event.id,
        eventId: event.event_id || event.eventId,
        userId: event.sql_user_id || event.userId,
        createdAt: event.saved_at || event.createdAt,
        event: event.event
      }));

      setSavedEvents(normalizedEvents);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error al obtener eventos guardados:', err);
      // No dejar que el error rompa toda la aplicación
      setSavedEvents([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveEvent = async (eventId: string, userId: string): Promise<SavedEvent | null> => {
    const token = getToken();

    if (!token) {
      setError('No hay sesión activa');
      return null;
    }

    try {
      setError(null);

      // El backend espera eventId y userId (sin guiones bajos)
      const payload = {
        eventId: eventId,
        userId: userId,
      };

      console.log('POST /events/saved - Payload:', payload);

      const res = await fetch(`${API_URL}/events/saved`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

      const savedEvent = await res.json();
      console.log('Evento guardado exitosamente:', savedEvent);

      // Agregar al estado local
      setSavedEvents(prev => [...prev, savedEvent]);

      return savedEvent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar evento';
      console.error('Error en saveEvent:', err);
      setError(errorMessage);
      return null;
    }
  };

  const unsaveEvent = async (savedEventId: string): Promise<boolean> => {
    const token = getToken();

    if (!token) {
      setError('No hay sesión activa');
      return false;
    }

    try {
      setError(null);

      const res = await fetch(`${API_URL}/events/saved/${savedEventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al eliminar evento guardado');
      }

      // Eliminar del estado local
      setSavedEvents(prev => prev.filter(se => se.id !== savedEventId));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar evento guardado');
      console.error('Error en unsaveEvent:', err);
      return false;
    }
  };

  const isEventSaved = (eventId: string): boolean => {
    return savedEvents.some(se => se.eventId === eventId);
  };

  useEffect(() => {
    if (userId) {
      fetchSavedEvents();
    }
  }, [fetchSavedEvents, userId]);

  return {
    savedEvents,
    loading,
    error,
    saveEvent,
    unsaveEvent,
    isEventSaved,
    refreshSavedEvents: fetchSavedEvents,
  };
}

