import { useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

export interface EventReview {
  _id?: string;
  id?: string;
  event_id: string;
  userId: string;
  sql_user_id: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

interface EventReviewEntry {
  reviews: EventReview[];
  avgRating: number;
  totalReviews: number;
  userReviewId?: string;
}

interface UseEventReviewsReturn {
  reviewsByEvent: Map<string, EventReviewEntry>;
  getEventReviews: (eventId: string) => EventReviewEntry;
  hasReviewed: (eventId: string) => boolean;
  submitReview: (eventId: string, sqlUserId: string, rating: number) => Promise<boolean>;
  removeReview: (eventId: string) => Promise<boolean>;
  fetchReviewsForEvent: (eventId: string) => Promise<void>;
  loading: boolean;
}

const EMPTY_ENTRY: EventReviewEntry = { reviews: [], avgRating: 0, totalReviews: 0, userReviewId: undefined };

function resolveId(record: EventReview): string {
  return (record._id ?? record.id ?? '') as string;
}

function calcAvg(reviews: EventReview[]): number {
  if (reviews.length === 0) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}

function buildEntry(reviews: EventReview[], sqlUserId?: string): EventReviewEntry {
  const userReview = sqlUserId
    ? reviews.find(r => r.sql_user_id === sqlUserId || r.userId === sqlUserId)
    : undefined;
  return {
    reviews,
    avgRating: calcAvg(reviews),
    totalReviews: reviews.length,
    userReviewId: userReview ? resolveId(userReview) : undefined,
  };
}

export function useEventReviews(sqlUserId?: string): UseEventReviewsReturn {
  const [reviewsByEvent, setReviewsByEvent] = useState<Map<string, EventReviewEntry>>(new Map());
  const [loading, setLoading] = useState(false);
  // Guarda los eventIds que ya fueron fetcheados para refetchear cuando sqlUserId llegue
  const fetchedEventIds = useRef<Set<string>>(new Set());

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') return localStorage.getItem('token');
    return null;
  };

  const setEntry = useCallback((eventId: string, entry: EventReviewEntry) => {
    setReviewsByEvent(prev => { const next = new Map(prev); next.set(eventId, entry); return next; });
  }, []);

  const fetchReviewsForEvent = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`${API_URL}/events/reviews/event/${eventId}`);
      if (!res.ok) return;
      const records: EventReview[] = await res.json();
      if (Array.isArray(records)) {
        fetchedEventIds.current.add(eventId);
        setEntry(eventId, buildEntry(records, sqlUserId));
      }
    } catch { /* silencioso */ }
  }, [sqlUserId, setEntry]);

  // Cuando sqlUserId llega async (undefined → valor), refetchear todos los eventos
  // ya cargados para recalcular userReviewId con el usuario correcto
  useEffect(() => {
    if (!sqlUserId) return;
    fetchedEventIds.current.forEach(eventId => {
      fetchReviewsForEvent(eventId);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqlUserId]);

  const getEventReviews = (eventId: string): EventReviewEntry =>
    reviewsByEvent.get(eventId) ?? EMPTY_ENTRY;

  const hasReviewed = (eventId: string): boolean =>
    !!reviewsByEvent.get(eventId)?.userReviewId;

  const submitReview = async (eventId: string, sqlUserId: string, rating: number): Promise<boolean> => {
    const token = getToken();
    if (!token || !sqlUserId) return false;
    if (hasReviewed(eventId)) return false;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/events/reviews`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, sql_user_id: sqlUserId, rating }),
      });

      if (res.status === 409) {
        // Ya existe en BD — refetchear para obtener el userReviewId real
        await fetchReviewsForEvent(eventId);
        return true;
      }

      if (!res.ok) return false;

      const record: EventReview = await res.json();
      const current = reviewsByEvent.get(eventId) ?? EMPTY_ENTRY;
      const updated = [...current.reviews, record];
      setEntry(eventId, { ...buildEntry(updated, sqlUserId), userReviewId: resolveId(record) });
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeReview = async (eventId: string): Promise<boolean> => {
    const token = getToken();
    const reviewId = reviewsByEvent.get(eventId)?.userReviewId;
    if (!token || !reviewId) return false;

    // Optimista
    const current = reviewsByEvent.get(eventId) ?? EMPTY_ENTRY;
    const optimistic = current.reviews.filter(r => resolveId(r) !== reviewId);
    setEntry(eventId, { ...buildEntry(optimistic, sqlUserId), userReviewId: undefined });

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/events/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        await fetchReviewsForEvent(eventId);
        return false;
      }
      return true;
    } catch {
      await fetchReviewsForEvent(eventId);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { reviewsByEvent, getEventReviews, hasReviewed, submitReview, removeReview, fetchReviewsForEvent, loading };
}