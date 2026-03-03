"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/app/components/layout/Header";
import Footer from "@/app/components/layout/Footer";
import ArtistCard from "@/app/components/cards/ArtistCard";
import { FaCircleChevronLeft, FaCircleChevronRight } from "react-icons/fa6";
import { useArtists, ArtistData } from "@/app/hooks/useArtists";

const ARTIST_FALLBACK_IMAGE = "/images/default-artist.jpg";

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { artists, loading, setSearch } = useArtists();

  // Capturar token de Google OAuth
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      window.dispatchEvent(new Event('authChange'));
      router.replace('/');
    }
  }, [searchParams, router]);

  // Sincronizar búsqueda con el hook
  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery, setSearch]);

  return (
    <div className="min-h-screen bg-riff-background-b">
      <Header onSearch={setSearchQuery} searchValue={searchQuery} />
      <main className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">

        {/* Hero Section */}
        <section
          className="relative h-[300px] sm:h-[400px] lg:h-[450px] w-full max-w-8xl mx-auto overflow-hidden rounded-lg"
          style={{
            backgroundImage: "url(/images/portada.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 h-full flex items-start pt-4 sm:pt-8 lg:pt-2 px-4 sm:px-8 md:px-12 lg:px-6">
            <div className="max-w-xl">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight"
                style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.7)" }}
              >
                Con Riff, impulsa tu musica al siguiente nivel
              </h1>
            </div>
          </div>
        </section>

        {/* Artistas Section */}
        <section className="max-w-8xl mx-auto px-0 sm:px-4 lg:px-0 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8 px-4 sm:px-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Artistas destacados'}
            </h2>
            <div className="flex gap-2">
              <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center group">
                <FaCircleChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-riff-primary group-hover:text-riff-primary-dark transition-colors" />
              </button>
              <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center group">
                <FaCircleChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-riff-primary group-hover:text-riff-primary-dark transition-colors" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-riff-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : artists.length === 0 ? (
            <p className="text-riff-text-secondary text-center py-12">
              {searchQuery ? 'No se encontraron artistas con ese nombre.' : 'Aún no hay artistas registrados.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 px-4 sm:px-0">
              {artists.map((artist: ArtistData) => (
                <ArtistCard
                  key={artist.id}
                  id={artist.id}
                  name={artist.name}
                  image={ARTIST_FALLBACK_IMAGE}
                  description={artist.biography ?? undefined}
                />
              ))}
            </div>
          )}
        </section>

      </main>
      <Footer />
    </div>
  );
}