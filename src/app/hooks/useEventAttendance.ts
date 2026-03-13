import { useState } from 'react';
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

// ── localStorage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = (userId: string) => `riff_attendance_${userId}`;

function loadFromStorage(userId: string): Map<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    if (!raw) return new Map();
    const obj: Record<string, string> = JSON.parse(raw);
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function saveToStorage(userId: string, map: Map<string, string>) {
  try {
    const obj = Object.fromEntries(map.entries());
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(obj));
  } catch {
    // si localStorage no está disponible no bloqueamos
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useEventAttendance(sqlUserId?: string): UseEventAttendanceReturn {
  const [attendedEvents, setAttendedEvents] = useState<Map<string, string>>(() =>
    sqlUserId ? loadFromStorage(sqlUserId) : new Map()
  );
  const [loading, setLoading] = useState(false);

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') return localStorage.getItem('token');
    return null;
  };

  // Actualiza estado + localStorage en una sola operación
  const update = (fn: (prev: Map<string, string>) => Map<string, string>) => {
    setAttendedEvents(prev => {
      const next = fn(prev);
      if (sqlUserId) saveToStorage(sqlUserId, next);
      return next;
    });
  };

  const isAttending = (eventId: string) => attendedEvents.has(eventId);

  const attend = async (eventId: string, sqlUserId: string): Promise<boolean> => {
    const token = getToken();
    if (!token || !sqlUserId) return false;

    setLoading(true);

    // Optimista
    update(prev => { const next = new Map(prev); next.set(eventId, '__pending__'); return next; });

    try {
      const res = await fetch(`${API_URL}/events/attendance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, sql_user_id: sqlUserId, status: 'confirmed' }),
      });

      if (!res.ok) {
        update(prev => { const next = new Map(prev); next.delete(eventId); return next; });
        return false;
      }

      const record: AttendanceRecord = await res.json();
      update(prev => { const next = new Map(prev); next.set(eventId, record.id); return next; });
      return true;
    } catch {
      update(prev => { const next = new Map(prev); next.delete(eventId); return next; });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unattend = async (eventId: string): Promise<boolean> => {
    const token = getToken();
    const attendanceId = attendedEvents.get(eventId);
    if (!token || !attendanceId || attendanceId === '__pending__') return false;

    setLoading(true);

    // Optimista
    update(prev => { const next = new Map(prev); next.delete(eventId); return next; });

    try {
      const res = await fetch(`${API_URL}/events/attendance/${attendanceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        update(prev => { const next = new Map(prev); next.set(eventId, attendanceId); return next; });
        return false;
      }
      return true;
    } catch {
      update(prev => { const next = new Map(prev); next.set(eventId, attendanceId); return next; });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { attendedEvents, isAttending, attend, unattend, loading };
}