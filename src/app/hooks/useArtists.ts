'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';
import { fetchFollowersCount } from '../utils/follows';

export interface ArtistData {
  id: string;
  name: string;
  biography?: string | null;
  role: 'ARTIST';
  status: boolean;
  createdAt: string;
  profileImage?: string | null;
  followersCount?: number;
  socialMedia?: { id: string; url: string }[];
}

interface UseArtistsReturn {
  artists: ArtistData[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  refreshArtists: () => Promise<void>;
}

const API_URL = API_BASE_URL;

export function useArtists(): UseArtistsReturn {
  const [artists, setArtists] = useState<ArtistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchArtists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Usar el endpoint correcto: GET /users/artists (devuelve solo ARTIST)
      const res = await fetch(`${API_URL}/users/artists?limit=50&offset=0`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al obtener artistas');
      }

      const data = await res.json();
      const rawList: Record<string, unknown>[] = Array.isArray(data) ? data : (data?.data ?? []);

      // Normalizar campos que pueden venir con nombres distintos según el backend
      let artistsList: ArtistData[] = rawList.map((a) => ({
        ...a,
        followersCount:
          (a.followersCount as number | undefined) ??
          (a.followers_count as number | undefined) ??
          ((a._count as Record<string, number> | undefined)?.followers) ??
          (a.followers as number | undefined) ??
          undefined,
      } as ArtistData));

      const artistsWithoutFollowers = artistsList.filter(
        (artist) => artist.id && (artist.followersCount === undefined || artist.followersCount === null)
      );

      if (artistsWithoutFollowers.length > 0) {
        const followerResults = await Promise.allSettled(
          artistsWithoutFollowers.map(async (artist) => ({
            id: artist.id,
            followersCount: await fetchFollowersCount(artist.id),
          }))
        );

        const followersMap = new Map<string, number>();
        followerResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.followersCount !== undefined) {
            followersMap.set(result.value.id, result.value.followersCount);
          }
        });

        artistsList = artistsList.map((artist) => ({
          ...artist,
          followersCount: followersMap.get(artist.id) ?? artist.followersCount,
        }));
      }

      // Filtro local por búsqueda
      if (search) {
        const searchLower = search.toLowerCase();
        artistsList = artistsList.filter(
          (artist) =>
            artist.name?.toLowerCase().includes(searchLower) ||
            artist.biography?.toLowerCase().includes(searchLower)
        );
      }

      setArtists(artistsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArtists();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchArtists]);

  return {
    artists,
    loading,
    error,
    search,
    setSearch,
    refreshArtists: fetchArtists,
  };
}