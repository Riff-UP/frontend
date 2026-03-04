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

      // Llamar al endpoint /users y filtrar artistas en el frontend
      const res = await fetch(`${API_URL}/users`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al obtener usuarios');
      }

      const data = await res.json();

      // Filtrar solo usuarios con role === 'ARTIST'
      let artistsList = data.filter((user: any) => user.role === 'ARTIST');

      // Aplicar búsqueda local si existe
      if (search) {
        const searchLower = search.toLowerCase();
        artistsList = artistsList.filter((artist: ArtistData) =>
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