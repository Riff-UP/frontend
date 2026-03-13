import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

export interface AttendanceRecord {
  id: string;
  event_id: string;
  userId: string;
  sql_user_id: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

interface UseEventAttendanceReturn {
  attendedEvents: Map<string, string>;
  isAttending: (eventId: string) => boolean;
  attend: (eventId: string, sqlUserId: string) => Promise<boolean>;
  unattend: (eventId: string) => Promise<boolean>;
  loading: boolean;
}

const STORAGE_KEY = (userId: string) => `riff_attendance_${userId}`;

function loadFromStorage(userId: string): Map<string, string> {
  try {
    if (typeof window === 'undefined') return new Map();
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
  } catch {
    return new Map();
  }
}

function saveToStorage(userId: string, map: Map<string, string>) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(Object.fromEntries(map.entries())));
  } catch { /* silencioso */ }
}

export function useEventAttendance(sqlUserId?: string): UseEventAttendanceReturn {
  const [attendedEvents, setAttendedEvents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') return localStorage.getItem('token');
    return null;
  };

  // Al montar: cargar desde el servidor (fuente de verdad) y cachear en localStorage
  useEffect(() => {
    if (!sqlUserId) return;
    const token = getToken();
    if (!token) return;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/events/attendance?userId=${sqlUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('fetch failed');

        const records: AttendanceRecord[] = await res.json();
        const map = new Map<string, string>();
        records.forEach(r => { if (r.status !== 'cancelled') map.set(r.event_id, r.id); });

        // Guardar en localStorage y actualizar estado
        saveToStorage(sqlUserId, map);
        setAttendedEvents(map);
      } catch {
        // Backend no disponible — usar localStorage como fallback
        setAttendedEvents(loadFromStorage(sqlUserId));
      }
    };

    load();
  }, [sqlUserId]);

  // Guardar estado React + localStorage de forma desacoplada
  const persist = (userId: string, map: Map<string, string>) => {
    saveToStorage(userId, map);  // sincrónico, no depende del ciclo de React
    setAttendedEvents(new Map(map));
  };

  const isAttending = (eventId: string): boolean => attendedEvents.has(eventId);

  const attend = async (eventId: string, sqlUserId: string): Promise<boolean> => {
    const token = getToken();
    if (!token || !sqlUserId) return false;

    // Chequear estado actual — si ya asiste, no hacer nada
    if (attendedEvents.has(eventId)) return true;

    setLoading(true);

    // Optimista — persistir inmediatamente (no dentro de setAttendedEvents)
    const optimistic = new Map(attendedEvents);
    optimistic.set(eventId, '__pending__');
    persist(sqlUserId, optimistic);

    try {
      const res = await fetch(`${API_URL}/events/attendance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, sql_user_id: sqlUserId, status: 'confirmed' }),
      });

      if (res.status === 409) {
        // Ya existe en BD — marcar y persistir
        const updated = new Map(attendedEvents);
        updated.set(eventId, '__conflict__');
        persist(sqlUserId, updated);
        return true;
      }

      if (!res.ok) {
        const reverted = new Map(attendedEvents);
        reverted.delete(eventId);
        persist(sqlUserId, reverted);
        return false;
      }

      const record: AttendanceRecord = await res.json();
      const confirmed = new Map(attendedEvents);
      confirmed.set(eventId, record.id);
      persist(sqlUserId, confirmed);
      return true;
    } catch {
      const reverted = new Map(attendedEvents);
      reverted.delete(eventId);
      persist(sqlUserId, reverted);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unattend = async (eventId: string): Promise<boolean> => {
    const token = getToken();
    const attendanceId = attendedEvents.get(eventId);
    if (!token || !attendanceId || attendanceId === '__pending__') return false;

    const uid = sqlUserId ?? '';

    if (attendanceId === '__conflict__') {
      const updated = new Map(attendedEvents);
      updated.delete(eventId);
      persist(uid, updated);
      return true;
    }

    setLoading(true);

    const optimistic = new Map(attendedEvents);
    optimistic.delete(eventId);
    persist(uid, optimistic);

    try {
      const res = await fetch(`${API_URL}/events/attendance/${attendanceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const reverted = new Map(attendedEvents);
        reverted.set(eventId, attendanceId);
        persist(uid, reverted);
        return false;
      }
      return true;
    } catch {
      const reverted = new Map(attendedEvents);
      reverted.set(eventId, attendanceId);
      persist(uid, reverted);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { attendedEvents, isAttending, attend, unattend, loading };
}