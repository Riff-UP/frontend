'use client';

import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../config/api';
import { extractFollowRecords, getFollowTargetId } from '../utils/follows';

const API_URL = API_BASE_URL;

interface FollowRecord {
  id?: string;
  followerId: string;
  followedId?: string;
  followingId?: string;
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
      const arr: FollowRecord[] = extractFollowRecords(data) as FollowRecord[];

      const set = new Set<string>();
      arr.forEach((follow) => {
        const targetId = getFollowTargetId(follow);
        if (targetId) set.add(targetId);
      });
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
        return false;
      }
      setLoading(true);
      try {
        const payload = { followerId: currentUserId, followedId: artistId };
        const res = await fetch(`${API_URL}/follows`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          await res.json().catch(() => ({}));
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
        return false;
      }
      setLoading(true);
      try {
        // El backend no devuelve id en el follow, usamos DELETE con query params
        const url = `${API_URL}/follows?followerId=${currentUserId}&followedId=${artistId}`;
        const res = await fetch(url, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          await res.json().catch(() => ({}));
          return false;
        }
        setFollowingSet(prev => {
          const next = new Set(prev);
          next.delete(artistId);
          return next;
        });
        return true;
      } catch {
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
