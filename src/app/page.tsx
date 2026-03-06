"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/app/components/layout/Header";
import Footer from "@/app/components/layout/Footer";
import ArtistCard from "@/app/components/cards/ArtistCard";
import EventRatingModal from "@/app/components/common/EventRatingModal";
import { useEventRating } from "@/app/hooks/useEventRating";
import { FaCircleChevronLeft, FaCircleChevronRight } from "react-icons/fa6";
import { useArtists, ArtistData } from "@/app/hooks/useArtists";
import { API_BASE_URL, getAuthHeaders } from "@/app/config/api";

const API_URL = API_BASE_URL;

interface RawPost {
  _id?: unknown;
  id?: unknown;
  sql_user_id?: string;
  authorId?: string;
  title?: string;
  description?: string;
  content?: string;
  mediaUrl?: string;
  createdAt?: string;
  created_at?: string;
}

interface HeroPublication {
  id: string;
  authorId: string;
  authorName: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
}

function extractId(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.$oid) return String(obj.$oid);
    if (obj._id) return extractId(obj._id);
    if (obj.id) return extractId(obj.id);
  }
  return String(raw);
}

function getPostImageUrl(post: RawPost): string | undefined {
  if (post.mediaUrl) return post.mediaUrl;
  if (post.content && (post.content.startsWith("http") || post.content.startsWith("/"))) {
    return post.content;
  }
  return undefined;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [heroPosts, setHeroPosts] = useState<RawPost[]>([]);
  const { artists, loading, setSearch } = useArtists();

  const heroPublications = useMemo<HeroPublication[]>(() => {
    const artistNameMap = new Map(artists.map((artist) => [artist.id, artist.name]));
    const artistIds = new Set(artists.map((artist) => artist.id));

    const normalized = heroPosts
      .map((post) => {
        const imageUrl = getPostImageUrl(post);
        const authorId = String(post.sql_user_id ?? post.authorId ?? "");
        const createdAt = post.createdAt ?? post.created_at ?? "";

        if (!imageUrl) return null;

        return {
          id: extractId(post._id ?? post.id),
          authorId,
          authorName: artistNameMap.get(authorId) ?? "Artista Riff",
          imageUrl,
          caption: post.description || post.title || "Nueva publicación",
          createdAt,
        };
      })
      .filter((post): post is HeroPublication => Boolean(post?.id && post.imageUrl));

    const uniqueByImage = normalized.filter(
      (post, index, arr) => arr.findIndex((item) => item.imageUrl === post.imageUrl) === index
    );

    const sorted = [...uniqueByImage].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const artistPosts = sorted.filter((post) => artistIds.has(post.authorId));
    return (artistPosts.length > 0 ? artistPosts : sorted).slice(0, 4);
  }, [artists, heroPosts]);

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

  // Cargar publicaciones para animar visualmente el hero
  useEffect(() => {
    const loadHeroPosts = async () => {
      try {
        const response = await fetch(`${API_URL}/posts`, { headers: getAuthHeaders(false) });
        if (!response.ok) return;

        const data = await response.json();
        const posts = Array.isArray(data) ? data : (data?.data ?? data?.posts ?? []);
        setHeroPosts(Array.isArray(posts) ? posts : []);
      } catch {
        setHeroPosts([]);
      }
    };

    loadHeroPosts();
  }, []);

  // Eventos a los que el usuario ha asistido (ejemplo)
  // En producción, esto vendría de una API
  const attendedEvents: Array<{ id: number; title: string; date: string; time: string }> = [
    // Agrega eventos aquí para probar el modal de valoración
  ];

  // Hook para manejar la valoración de eventos
  const { eventToRate, handleRatingSubmit, handleRatingClose } = useEventRating(attendedEvents);

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
          <div className="absolute inset-0 bg-black/55" />

          {heroPublications.length > 0 && (
            <div className="absolute inset-y-0 right-0 z-0 hidden sm:flex items-center pr-4 md:pr-8 lg:pr-10 pointer-events-none">
              <div className="grid grid-cols-2 gap-3 md:gap-4 w-[240px] md:w-[320px] lg:w-[420px] opacity-95">
                {heroPublications.map((publication, index) => (
                  <div
                    key={publication.id}
                    className={`relative overflow-hidden rounded-2xl border border-white/15 shadow-2xl ${index % 2 === 0 ? "translate-y-4" : "-translate-y-4"}`}
                  >
                    <div
                      className="h-28 md:h-36 lg:h-44 bg-cover bg-center scale-105"
                      style={{ backgroundImage: `url(${publication.imageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-riff-primary/90">
                        Publicación
                      </p>
                      <p className="text-white text-xs md:text-sm font-semibold line-clamp-1">
                        {publication.authorName}
                      </p>
                      <p className="text-white/80 text-[11px] md:text-xs line-clamp-2">
                        {publication.caption}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative z-10 h-full flex items-start pt-4 sm:pt-8 lg:pt-2 px-4 sm:px-8 md:px-12 lg:px-6">
            <div className="max-w-xl lg:max-w-2xl">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight"
                style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.7)" }}
              >
                Con Riff, impulsa tu musica al siguiente nivel
              </h1>
              {heroPublications.length > 0 && (
                <p className="hidden sm:block mt-4 max-w-md text-sm md:text-base text-white/85">
                  Descubre lo más reciente de la comunidad con publicaciones visuales de artistas destacando ahora mismo.
                </p>
              )}
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
                  image={artist.profileImage ?? undefined}
                  followers={artist.followersCount ?? 0}
                  description={artist.biography ?? undefined}
                />
              ))}
            </div>
          )}
        </section>

      </main>
      <Footer />

      {/* Event Rating Modal */}
      {eventToRate && (
        <EventRatingModal
          isOpen={!!eventToRate}
          eventTitle={eventToRate.title}
          eventDate={eventToRate.date}
          onSubmit={(rating, comment) => handleRatingSubmit(eventToRate.id, rating, comment)}
          onClose={handleRatingClose}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}