'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ArtistData {
  id: string;
  name: string;
  biography?: string | null;
  role: 'ARTIST';
  status: boolean;
  createdAt: string;
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

const API_URL = 'http://localhost:4000/api';

export function useArtists(): UseArtistsReturn {
  const [artists, setArtists] = useState<ArtistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchArtists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${API_URL}/users/artists${params}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al obtener artistas');
      }

      const data = await res.json();
      setArtists(data);
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