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

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.message === 'string') return payload.message;
    if (Array.isArray(payload?.message)) return payload.message.join(', ');
    return fallback;
  } catch {
    return fallback;
  }
}

function getUserIdFromToken(token: string): string | undefined {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;
    const payload = JSON.parse(atob(parts[1]));
    return payload.id || payload.userId || payload.sub || undefined;
  } catch {
    return undefined;
  }
}

function sameEventDate(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  if (Number.isNaN(left) || Number.isNaN(right)) {
    return a === b;
  }
  return left === right;
}

async function fetchEventsSnapshot(token: string): Promise<EventData[]> {
  const res = await fetch(`${API_URL}/events`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const allEvents: EventData[] = data.data || data || [];
  const currentUserId = getUserIdFromToken(token);

  if (!currentUserId) return allEvents;
  return allEvents.filter((event) => String(event.sql_user_id) === currentUserId);
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
      const sql_user_id = getUserIdFromToken(token);

      const payload = {
        title: data.title,
        description: data.description,
        event_date: data.event_date,
        location: data.location,
        ...(sql_user_id ? { sql_user_id } : {}),
      };

      let res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Compatibilidad: si el backend valida DTO estricto, reintentar solo con campos base.
      if (res.status === 400) {
        const minimalPayload = {
          title: data.title,
          description: data.description,
          event_date: data.event_date,
          location: data.location,
          ...(sql_user_id ? { sql_user_id } : {}),
        };

        res = await fetch(`${API_URL}/events`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(minimalPayload),
        });
      }

      if (!res.ok) {
        const snapshot = await fetchEventsSnapshot(token);
        const persisted = snapshot.find((event) => {
          return (
            event.title === data.title
            && event.location === data.location
            && sameEventDate(event.event_date, data.event_date)
          );
        });

        if (persisted) {
          setEvents(snapshot);
          return persisted;
        }

        const message = await readErrorMessage(res, `Error ${res.status}: ${res.statusText}`);
        throw new Error(message);
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

      const payload: UpdateEventData = {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.event_date !== undefined ? { event_date: data.event_date } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
      };

      let res = await fetch(`${API_URL}/events/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 400) {
        const minimalPayload: UpdateEventData = {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.event_date !== undefined ? { event_date: data.event_date } : {}),
          ...(data.location !== undefined ? { location: data.location } : {}),
        };

        res = await fetch(`${API_URL}/events/${id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(minimalPayload),
        });
      }

      if (!res.ok) {
        const snapshot = await fetchEventsSnapshot(token);
        const persisted = snapshot.find((event) => event._id === id);

        if (persisted) {
          const titleOk = data.title === undefined || persisted.title === data.title;
          const locationOk = data.location === undefined || persisted.location === data.location;
          const descriptionOk = data.description === undefined || persisted.description === data.description;
          const dateOk = data.event_date === undefined || sameEventDate(persisted.event_date, data.event_date);

          if (titleOk && locationOk && descriptionOk && dateOk) {
            setEvents(snapshot);
            return true;
          }
        }

        const message = await readErrorMessage(res, 'Error al actualizar evento');
        throw new Error(message);
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