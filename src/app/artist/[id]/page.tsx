'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/app/components/layout/Header';
import ArtistProfile from '@/app/components/ArtistProfile';
import { ArtistData } from '@/app/types';

const API_URL = 'http://localhost:4000/api';

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Si es el propio perfil, redirigir a /profile
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.id === id) {
          router.replace('/profile');
          return;
        }
      } catch {
        // token inválido, continuar normal
      }
    }

    const fetchArtist = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/users/${id}`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          if (res.status === 404) {
            setError('Artista no encontrado');
          } else {
            setError('Error al cargar el perfil');
          }
          return;
        }

        const data = await res.json();
        setArtist(data);
      } catch {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-riff-background-b">
        <Header />
        <div className="flex justify-center items-center min-h-[60vh]">
          <svg className="animate-spin h-8 w-8 text-riff-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen bg-riff-background-b">
        <Header />
        <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
          <p className="text-white text-lg">{error || 'Artista no encontrado'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-riff-primary text-white rounded-sm hover:bg-riff-primary-dark transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-riff-background-b">
      <Header />
      <ArtistProfile artist={artist} />
    </div>
  );
}