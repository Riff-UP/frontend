import { useState, useCallback, useEffect } from 'react';
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
  // Mapa de eventId → attendanceId (solo los eventos a los que el user asiste)
  attendedEvents: Map<string, string>;
  isAttending: (eventId: string) => boolean;
  attend: (eventId: string, sqlUserId: string) => Promise<boolean>;
  unattend: (eventId: string) => Promise<boolean>;
  loading: boolean;
}

export function useEventAttendance(sqlUserId?: string): UseEventAttendanceReturn {
  // eventId → attendance.id
  const [attendedEvents, setAttendedEvents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') return localStorage.getItem('token');
    return null;
  };

  // Cargar asistencias del usuario actual
  const fetchMyAttendances = useCallback(async () => {
    if (!sqlUserId) return;
    const token = getToken();
    if (!token) return;

    try {
      setLoading(true);
      // Trae todas las asistencias y filtramos por sql_user_id client-side
      // (el endpoint acepta ?userId= con el UUID de Mongo, pero tenemos el sql_user_id)
      const res = await fetch(`${API_URL}/events/attendance`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) return;

      const data: AttendanceRecord[] = await res.json();
      const mine = Array.isArray(data)
        ? data.filter(a => a.sql_user_id === sqlUserId && a.status !== 'cancelled')
        : [];

      const map = new Map<string, string>();
      mine.forEach(a => map.set(a.event_id, a.id));
      setAttendedEvents(map);
    } catch {
      // silencioso — no bloquear la UI
    } finally {
      setLoading(false);
    }
  }, [sqlUserId]);

  useEffect(() => { fetchMyAttendances(); }, [fetchMyAttendances]);

  const isAttending = (eventId: string) => attendedEvents.has(eventId);

  const attend = async (eventId: string, sqlUserId: string): Promise<boolean> => {
    const token = getToken();
    if (!token || !sqlUserId) return false;

    // Optimista
    setAttendedEvents(prev => {
      const next = new Map(prev);
      next.set(eventId, '__pending__');
      return next;
    });

    try {
      const res = await fetch(`${API_URL}/events/attendance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, sql_user_id: sqlUserId, status: 'confirmed' }),
      });

      if (!res.ok) {
        // Revertir
        setAttendedEvents(prev => {
          const next = new Map(prev);
          next.delete(eventId);
          return next;
        });
        return false;
      }

      const record: AttendanceRecord = await res.json();
      setAttendedEvents(prev => {
        const next = new Map(prev);
        next.set(eventId, record.id);
        return next;
      });
      return true;
    } catch {
      setAttendedEvents(prev => {
        const next = new Map(prev);
        next.delete(eventId);
        return next;
      });
      return false;
    }
  };

  const unattend = async (eventId: string): Promise<boolean> => {
    const token = getToken();
    const attendanceId = attendedEvents.get(eventId);
    if (!token || !attendanceId || attendanceId === '__pending__') return false;

    // Optimista
    setAttendedEvents(prev => {
      const next = new Map(prev);
      next.delete(eventId);
      return next;
    });

    try {
      const res = await fetch(`${API_URL}/events/attendance/${attendanceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        // Revertir
        setAttendedEvents(prev => {
          const next = new Map(prev);
          next.set(eventId, attendanceId);
          return next;
        });
        return false;
      }
      return true;
    } catch {
      setAttendedEvents(prev => {
        const next = new Map(prev);
        next.set(eventId, attendanceId);
        return next;
      });
      return false;
    }
  };

  return { attendedEvents, isAttending, attend, unattend, loading };
}