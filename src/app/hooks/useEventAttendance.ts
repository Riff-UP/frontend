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

export function useEventAttendance(sqlUserId?: string): UseEventAttendanceReturn {
  const [attendedEvents, setAttendedEvents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') return localStorage.getItem('token');
    return null;
  };

  const isAttending = (eventId: string) => attendedEvents.has(eventId);

  const attend = async (eventId: string, sqlUserId: string): Promise<boolean> => {
    const token = getToken();
    if (!token || !sqlUserId) return false;

    setLoading(true);

    // Actualización optimista
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
    } finally {
      setLoading(false);
    }
  };

  const unattend = async (eventId: string): Promise<boolean> => {
    const token = getToken();
    const attendanceId = attendedEvents.get(eventId);
    if (!token || !attendanceId || attendanceId === '__pending__') return false;

    setLoading(true);

    // Actualización optimista
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
    } finally {
      setLoading(false);
    }
  };

  return { attendedEvents, isAttending, attend, unattend, loading };
}