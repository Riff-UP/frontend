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
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
  } catch {
    return new Map();
  }
}

function saveToStorage(userId: string, map: Map<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(Object.fromEntries(map.entries())));
  } catch { /* silencioso */ }
}

export function useEventAttendance(sqlUserId?: string): UseEventAttendanceReturn {
  const [attendedEvents, setAttendedEvents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  // Hidratar cada vez que sqlUserId esté disponible (cubre remount y carga asíncrona del user)
  useEffect(() => {
    if (!sqlUserId) return;
    setAttendedEvents(loadFromStorage(sqlUserId));
  }, [sqlUserId]);

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') return localStorage.getItem('token');
    return null;
  };

  const update = (userId: string, fn: (prev: Map<string, string>) => Map<string, string>) => {
    setAttendedEvents(prev => {
      const next = fn(prev);
      if (userId) saveToStorage(userId, next);
      return next;
    });
  };

  const isAttending = (eventId: string) => attendedEvents.has(eventId);

  const attend = async (eventId: string, sqlUserId: string): Promise<boolean> => {
    const token = getToken();
    if (!token || !sqlUserId) return false;

    // Leer localStorage directamente para evitar race condition con el estado de React
    const stored = loadFromStorage(sqlUserId);
    if (stored.has(eventId)) {
      // Sincronizar estado si aún no lo tiene (race condition entre useEffect y click)
      setAttendedEvents(stored);
      return true;
    }

    setLoading(true);
    update(sqlUserId, prev => { const next = new Map(prev); next.set(eventId, '__pending__'); return next; });

    try {
      const res = await fetch(`${API_URL}/events/attendance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, sql_user_id: sqlUserId, status: 'confirmed' }),
      });

      if (res.status === 409) {
        update(sqlUserId, prev => { const next = new Map(prev); next.set(eventId, '__conflict__'); return next; });
        return true;
      }

      if (!res.ok) {
        update(sqlUserId, prev => { const next = new Map(prev); next.delete(eventId); return next; });
        return false;
      }

      const record: AttendanceRecord = await res.json();
      update(sqlUserId, prev => { const next = new Map(prev); next.set(eventId, record.id); return next; });
      return true;
    } catch {
      update(sqlUserId, prev => { const next = new Map(prev); next.delete(eventId); return next; });
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
      update(uid, prev => { const next = new Map(prev); next.delete(eventId); return next; });
      return true;
    }

    setLoading(true);
    update(uid, prev => { const next = new Map(prev); next.delete(eventId); return next; });

    try {
      const res = await fetch(`${API_URL}/events/attendance/${attendanceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        update(uid, prev => { const next = new Map(prev); next.set(eventId, attendanceId); return next; });
        return false;
      }
      return true;
    } catch {
      update(uid, prev => { const next = new Map(prev); next.set(eventId, attendanceId); return next; });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { attendedEvents, isAttending, attend, unattend, loading };
}