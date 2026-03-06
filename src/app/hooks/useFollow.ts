'use client';

import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const API_URL = API_BASE_URL;

interface FollowRecord {
  id?: string;
  followerId: string;
  followedId: string;
  createdAt?: string;
}

export function useFollow(currentUserId?: string) {
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchMyFollows = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${API_URL}/follows?followerId=${currentUserId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const arr: FollowRecord[] = Array.isArray(data) ? data : (data?.data ?? []);
      console.log('📋 fetchMyFollows - total:', arr.length, '| primer item:', JSON.stringify(arr[0]));

      const set = new Set<string>();
      arr.forEach(f => {
        if (f.followedId) set.add(f.followedId);
      });
      console.log('📋 followingSet:', [...set]);
      setFollowingSet(set);
    } catch { /* silencioso */ }
  }, [currentUserId]);

  useEffect(() => {
    fetchMyFollows();
  }, [fetchMyFollows]);

  const isFollowing = useCallback(
    (artistId: string) => followingSet.has(artistId),
    [followingSet]
  );

  const follow = useCallback(
    async (artistId: string): Promise<boolean> => {
      if (!currentUserId || currentUserId === 'undefined' || !artistId) {
        console.warn('⚠️ follow: ids inválidos', { currentUserId, artistId });
        return false;
      }
      setLoading(true);
      try {
        const payload = { followerId: currentUserId, followedId: artistId };
        console.log('➕ POST /follows - Payload:', payload);
        const res = await fetch(`${API_URL}/follows`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('❌ follow error:', err);
          if (Array.isArray(err.message)) console.error('❌ follow validation:', err.message.join(', '));
          return false;
        }
        setFollowingSet(prev => new Set(prev).add(artistId));
        return true;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentUserId]
  );

  const unfollow = useCallback(
    async (artistId: string): Promise<boolean> => {
      if (!currentUserId) {
        console.warn('⚠️ unfollow: sin currentUserId');
        return false;
      }
      setLoading(true);
      try {
        // El backend no devuelve id en el follow, usamos DELETE con query params
        const url = `${API_URL}/follows?followerId=${currentUserId}&followedId=${artistId}`;
        console.log('🗑️ DELETE', url);
        const res = await fetch(url, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('❌ unfollow error:', err);
          return false;
        }
        setFollowingSet(prev => {
          const next = new Set(prev);
          next.delete(artistId);
          return next;
        });
        return true;
      } catch (e) {
        console.error('❌ unfollow exception:', e);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentUserId]
  );

  const toggleFollow = useCallback(
    async (artistId: string): Promise<boolean> => {
      if (isFollowing(artistId)) return unfollow(artistId);
      return follow(artistId);
    },
    [isFollowing, follow, unfollow]
  );

  return { isFollowing, follow, unfollow, toggleFollow, loading, refreshFollows: fetchMyFollows };
}
