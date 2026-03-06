'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

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
      let artistsList: ArtistData[] = Array.isArray(data) ? data : (data?.data ?? []);

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