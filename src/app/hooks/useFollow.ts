'use client';

import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const API_URL = API_BASE_URL;

interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  createdAt?: string;
}

export function useFollow(currentUserId?: string) {
  // followingMap: followingId -> followRecordId (vacío = no sigue)
  const [followingMap, setFollowingMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  // Cargar todos los follows del usuario actual usando query param followerId
  const fetchMyFollows = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${API_URL}/follows?followerId=${currentUserId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const arr: FollowRecord[] = Array.isArray(data) ? data : (data?.data ?? []);

      const map = new Map<string, string>();
      // El backend ya devuelve solo los follows del usuario, mapear directo
      arr.forEach(f => {
        if (f.followingId) map.set(f.followingId, f.id);
      });

      setFollowingMap(map);
    } catch {
      // silencioso
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchMyFollows();
  }, [fetchMyFollows]);

  const isFollowing = useCallback(
    (artistId: string) => followingMap.has(artistId),
    [followingMap]
  );

  const follow = useCallback(
    async (artistId: string): Promise<boolean> => {
      if (!currentUserId || !artistId) return false;
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/follows`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ followerId: currentUserId, followingId: artistId }),
        });
        if (!res.ok) return false;
        const data: FollowRecord = await res.json();
        setFollowingMap(prev => new Map(prev).set(artistId, data.id));
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
      if (!currentUserId) return false;
      const followId = followingMap.get(artistId);
      if (!followId) return false;
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/follows/${followId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (!res.ok) return false;
        setFollowingMap(prev => {
          const next = new Map(prev);
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
    [currentUserId, followingMap]
  );

  const toggleFollow = useCallback(
    async (artistId: string): Promise<boolean> => {
      if (isFollowing(artistId)) {
        return unfollow(artistId);
      }
      return follow(artistId);
    },
    [isFollowing, follow, unfollow]
  );

  return { isFollowing, follow, unfollow, toggleFollow, loading, refreshFollows: fetchMyFollows };
}

