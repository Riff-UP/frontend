'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiSearch, FiMusic, FiCalendar, FiMapPin, FiHeart, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';
import { BsPeopleFill } from 'react-icons/bs';
import { MdMusicNote } from 'react-icons/md';
import { useArtists } from '../hooks/useArtists';
import { useUser } from '../hooks/useUser';
import { useFollow } from '../hooks/useFollow';
import { API_BASE_URL, getAuthHeaders } from '../config/api';
import { fetchFollowersCount } from '../utils/follows';

const API_URL = API_BASE_URL;

interface RawPost {
  _id?: unknown; id?: unknown;
  sql_user_id?: string; authorId?: string;
  title?: string; description?: string; content?: string;
  mediaUrl?: string; likesCount?: number;
  createdAt?: string; created_at?: string;
}

interface RawEvent {
  _id?: unknown; id?: unknown;
  sql_user_id?: string; organizerId?: string;
  title?: string; description?: string;
  location?: string;
  event_date?: string;    // campo correcto del backend
  startDate?: string;     // fallback legacy
  start_date?: string;    // fallback legacy
  status?: string;
}

interface HomePost {
  id: string; authorId: string; authorName: string;
  content: string; image?: string;
  likes: number; date: string; time: string;
  isLiked: boolean; isSaved: boolean;
  authorImage?: string;
}

interface HomeEvent {
  id: string; organizerId: string; organizerName: string;
  title: string; description?: string;
  location: string; date: string; status?: string;
}

interface BannerSlide {
  imageUrl: string;
  type: 'post' | 'artist';
  label: string;       // nombre del artista
  sublabel: string;    // contenido/descripción
  linkHref: string;
}

function extractId(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    if ('$oid' in (raw as object)) return String((raw as { $oid: string }).$oid);
  }
  return String(raw);
}

function formatTimeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'Ahora';
  if (s < 3600) return `Hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `Hace ${Math.floor(s / 86400)} días`;
  return date.toLocaleDateString();
}

export default function HomePage() {
  const { user } = useUser();
  const { artists, loading: loadingArtists, search, setSearch } = useArtists();
  const { isFollowing, toggleFollow } = useFollow(user?.id);

  const [posts, setPosts] = useState<HomePost[]>([]);
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeTab, setActiveTab] = useState<'artistas' | 'publicaciones' | 'eventos'>('artistas');
  const [likingId, setLikingId] = useState<string | null>(null);
  const [userNamesMap, setUserNamesMap] = useState<Map<string, string>>(new Map());
  const [userImagesMap, setUserImagesMap] = useState<Map<string, string>>(new Map());
  // Mapa de seguidores: artistId -> count
  const [followersMap, setFollowersMap] = useState<Map<string, number>>(new Map());

  // ── Banner dinámico ──
  const [bannerSlides, setBannerSlides] = useState<BannerSlide[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mapa de artistas para lookup rápido (nombre + imagen)
  const artistMap = useMemo(() => {
    const map = new Map<string, string>();
    artists.forEach(a => map.set(a.id, a.name));
    return map;
  }, [artists]);

  const artistImageMap = useMemo(() => {
    const map = new Map<string, string>();
    artists.forEach(a => { if (a.profileImage) map.set(a.id, a.profileImage); });
    return map;
  }, [artists]);

  // Cargar posts
  useEffect(() => {
    const load = async () => {
      setLoadingPosts(true);
      try {
        const res = await fetch(`${API_URL}/posts`, { headers: getAuthHeaders(false) });
        if (!res.ok) return;
        const data = await res.json();
        const arr: RawPost[] = Array.isArray(data) ? data : (data?.data ?? data?.posts ?? []);
        const mapped: HomePost[] = arr.map(p => {
          const id = extractId(p._id ?? p.id);
          const authorId = String(p.sql_user_id ?? p.authorId ?? '');
          const rawDate = p.createdAt || p.created_at;
          const imageUrl = p.mediaUrl
            || (p.content && (p.content.startsWith('http') || p.content.startsWith('/'))
              ? p.content : undefined);
          const textContent = p.description
            || (p.content && !p.content.startsWith('http') ? p.content : '')
            || p.title || '';
          return {
            id, authorId,
            authorName: '',   // se rellena después con artistMap
            content: textContent,
            image: imageUrl,
            likes: p.likesCount ?? 0,
            date: rawDate ? new Date(rawDate).toLocaleDateString() : 'Sin fecha',
            time: rawDate ? formatTimeAgo(new Date(rawDate)) : '',
            isLiked: false,
            isSaved: false,
          };
        });
        setPosts(mapped);
      } catch { /* silencioso */ }
      finally { setLoadingPosts(false); }
    };
    load();
  }, []);

  // Cargar eventos
  useEffect(() => {
    const load = async () => {
      setLoadingEvents(true);
      try {
        const res = await fetch(`${API_URL}/events`, { headers: getAuthHeaders(false) });
        if (!res.ok) return;
        const data = await res.json();
        const arr: RawEvent[] = Array.isArray(data) ? data : (data?.data ?? []);
        const mapped: HomeEvent[] = arr.map(e => {
          const id = extractId(e._id ?? e.id);
          const organizerId = String(e.sql_user_id ?? e.organizerId ?? '');
          // El backend devuelve event_date (no startDate)
          const rawDate = e.event_date || e.startDate || e.start_date;
          return {
            id, organizerId,
            organizerName: '',
            title: e.title ?? 'Evento',
            description: e.description,
            location: e.location ?? '',
            date: rawDate ? new Date(rawDate).toLocaleDateString() : 'Fecha TBD',
            status: e.status,
          };
        });
        setEvents(mapped);
      } catch { /* silencioso */ }
      finally { setLoadingEvents(false); }
    };
    load();
  }, []);

  // Enriquecer posts y eventos con nombre e imagen del artista
  const enrichedPosts = useMemo(() =>
    posts.map(p => ({
      ...p,
      authorName: artistMap.get(p.authorId) || userNamesMap.get(p.authorId) || 'Usuario',
      authorImage: artistImageMap.get(p.authorId) || userImagesMap.get(p.authorId),
    })),
    [posts, artistMap, artistImageMap, userNamesMap, userImagesMap]
  );

  const enrichedEvents = useMemo(() =>
    events.map(e => ({ ...e, organizerName: artistMap.get(e.organizerId) || userNamesMap.get(e.organizerId) || 'Usuario' })),
    [events, artistMap, userNamesMap]
  );

  // Buscar nombres de autores que no están en artistMap
  useEffect(() => {
    if (loadingPosts || loadingEvents || loadingArtists) return;

    const unknownIds = new Set<string>();
    posts.forEach(p => { if (p.authorId && !artistMap.has(p.authorId)) unknownIds.add(p.authorId); });
    events.forEach(e => { if (e.organizerId && !artistMap.has(e.organizerId)) unknownIds.add(e.organizerId); });

    if (unknownIds.size === 0) return;

    const fetchNames = async () => {
      const nameEntries: [string, string][] = [];
      const imageEntries: [string, string][] = [];
      await Promise.allSettled(
        Array.from(unknownIds).map(async (id) => {
          try {
            const res = await fetch(`${API_URL}/users/${id}`, { headers: getAuthHeaders(false) });
            if (!res.ok) return;
            const data = await res.json();
            const name = data.name || data.username || data.email?.split('@')[0] || 'Usuario';
            nameEntries.push([id, name]);
            if (data.profileImage) imageEntries.push([id, data.profileImage]);
          } catch { /* silencioso */ }
        })
      );
      if (nameEntries.length > 0) {
        setUserNamesMap(prev => {
          const next = new Map(prev);
          nameEntries.forEach(([id, name]) => next.set(id, name));
          return next;
        });
      }
      if (imageEntries.length > 0) {
        setUserImagesMap(prev => {
          const next = new Map(prev);
          imageEntries.forEach(([id, img]) => next.set(id, img));
          return next;
        });
      }
    };

    fetchNames();
  }, [posts, events, artistMap, artistImageMap, loadingPosts, loadingEvents, loadingArtists]);

  const filteredArtists = artists; // ya filtrado por useArtists

  // Artistas que el usuario sigue
  const followedArtists = useMemo(() =>
    artists.filter(a => isFollowing(a.id)),
    [artists, isFollowing]
  );

  // Cargar seguidores de cada artista
  useEffect(() => {
    if (artists.length === 0) return;
    const fetchFollowers = async () => {
      const entries: [string, number][] = [];
      await Promise.allSettled(
        artists.map(async (artist) => {
          try {
            const followers = await fetchFollowersCount(artist.id);
            entries.push([artist.id, followers ?? 0]);
          } catch {
            entries.push([artist.id, 0]);
          }
        })
      );
      setFollowersMap(new Map(entries));
    };
    fetchFollowers();
  }, [artists]);

  // Construir slides del banner dinámico
  useEffect(() => {
    if (loadingPosts && loadingArtists) return;

    const slides: BannerSlide[] = [];

    // Posts con imagen (los más recientes primero)
    const postsWithImage = enrichedPosts.filter(p => p.image);
    // Mezclar aleatoriamente y tomar hasta 6
    const shuffledPosts = [...postsWithImage].sort(() => Math.random() - 0.5).slice(0, 6);
    shuffledPosts.forEach(p => {
      slides.push({
        imageUrl: p.image!,
        type: 'post',
        label: p.authorName,
        sublabel: p.content || 'Publicación',
        linkHref: `/artist/${p.authorId}`,
      });
    });

    // Artistas con imagen de perfil
    const artistsWithImage = artists.filter(a => a.profileImage);
    const shuffledArtists = [...artistsWithImage].sort(() => Math.random() - 0.5).slice(0, 4);
    shuffledArtists.forEach(a => {
      slides.push({
        imageUrl: a.profileImage!,
        type: 'artist',
        label: a.name,
        sublabel: a.biography ? a.biography.slice(0, 60) + (a.biography.length > 60 ? '…' : '') : 'Artista',
        linkHref: `/artist/${a.id}`,
      });
    });

    // Mezclar el conjunto final
    const finalSlides = slides.sort(() => Math.random() - 0.5);

    if (finalSlides.length > 0) {
      setBannerSlides(finalSlides);
      setBannerIndex(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedPosts, artists, loadingPosts, loadingArtists]);

  // Auto-avance del banner cada 5 segundos
  const nextBannerSlide = useCallback(() => {
    setBannerIndex(prev => (bannerSlides.length > 0 ? (prev + 1) % bannerSlides.length : 0));
  }, [bannerSlides.length]);

  const prevBannerSlide = useCallback(() => {
    setBannerIndex(prev => (bannerSlides.length > 0 ? (prev - 1 + bannerSlides.length) % bannerSlides.length : 0));
  }, [bannerSlides.length]);

  useEffect(() => {
    if (bannerSlides.length === 0) return;
    bannerTimer.current = setInterval(nextBannerSlide, 5000);
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, [bannerSlides.length, nextBannerSlide]);

  const handleLike = async (postId: string) => {
    if (!user) return;
    if (likingId === postId) return;
    setLikingId(postId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/posts/reactions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, sql_user_id: user.id, type: 'like' }),
      });
      if (!res.ok) return;
      const raw = await res.json();
      const action = String(raw.action ?? '');
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, isLiked: action !== 'removed', likes: action === 'removed' ? p.likes - 1 : p.likes + 1 }
          : p
      ));
    } catch { /* silencioso */ }
    finally { setLikingId(null); }
  };

  return (
    <div className="min-h-screen bg-riff-text-primary">
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden min-h-[420px] sm:min-h-[480px]">
        {/* Fondo dinámico: imagen actual del slide con crossfade */}
        <div className="absolute inset-0">
          {bannerSlides.length > 0 ? (
            bannerSlides.map((slide, i) => (
              <div
                key={slide.imageUrl + i}
                className="absolute inset-0 transition-opacity duration-1000"
                style={{ opacity: i === bannerIndex ? 1 : 0, zIndex: i === bannerIndex ? 1 : 0 }}
              >
                <Image
                  src={slide.imageUrl}
                  alt="Banner dinámico"
                  fill
                  className="object-cover object-center"
                  priority={i === 0}
                />
              </div>
            ))
          ) : (
            <Image src="/images/portada.jpg" alt="Banner Riff" fill className="object-cover object-top opacity-30" priority />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" style={{ zIndex: 2 }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-riff-text-primary" style={{ zIndex: 2 }} />
        </div>

        {/* Contenido */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 sm:py-24 flex flex-col lg:flex-row items-center gap-10">
          {/* Texto izquierdo */}
          <div className="flex-1 text-left">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight drop-shadow-lg">
              Con Riff, impulsa tu<br />música al siguiente nivel
            </h1>
            <p className="text-white/70 text-sm sm:text-base mb-8 max-w-md">
              Descubre lo más reciente de la comunidad con publicaciones visuales de artistas destacando ahora mismo.
            </p>
            {/* Buscador */}
            <div className="relative max-w-sm">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                placeholder="Buscar artistas…"
                value={search}
                onChange={e => { setSearch(e.target.value); setActiveTab('artistas'); }}
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary transition-all backdrop-blur-sm"
              />
            </div>

            {/* Controles del banner */}
            {bannerSlides.length > 1 && (
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={prevBannerSlide}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-riff-primary/30 border border-white/20 flex items-center justify-center text-white transition-all"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-1.5">
                  {bannerSlides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setBannerIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? 'w-6 bg-riff-primary' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={nextBannerSlide}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-riff-primary/30 border border-white/20 flex items-center justify-center text-white transition-all"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Grid de cards derecha — solo en pantallas grandes */}
          {bannerSlides.length >= 4 && (
            <div className="hidden lg:grid grid-cols-2 gap-3 flex-shrink-0 w-[420px]">
              {bannerSlides.slice(0, 4).map((slide, i) => (
                <Link key={i} href={slide.linkHref} className="group relative rounded-xl overflow-hidden aspect-square bg-riff-header border border-white/10 hover:border-riff-primary/50 transition-all">
                  <Image
                    src={slide.imageUrl}
                    alt={slide.label}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-riff-primary text-[9px] font-bold uppercase tracking-widest mb-0.5">
                      {slide.type === 'post' ? 'Publicación' : 'Artista'}
                    </p>
                    <p className="text-white text-xs font-semibold truncate">{slide.label}</p>
                    <p className="text-white/60 text-[10px] truncate">{slide.sublabel}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Badge del slide actual (info del fondo) */}
        {bannerSlides.length > 0 && (
          <div className="absolute bottom-4 left-4 z-10 hidden sm:block">
            <Link href={bannerSlides[bannerIndex].linkHref} className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 hover:border-riff-primary/50 transition-all">
              <MdMusicNote className="w-4 h-4 text-riff-primary flex-shrink-0" />
              <div>
                <p className="text-white/50 text-[9px] uppercase tracking-widest">
                  {bannerSlides[bannerIndex].type === 'post' ? 'Publicación reciente' : 'Artista destacado'}
                </p>
                <p className="text-white text-xs font-semibold">{bannerSlides[bannerIndex].label}</p>
              </div>
            </Link>
          </div>
        )}
      </section>

      {/* ── Tabs ── */}
      <div className="sticky top-14 z-30 bg-riff-text-primary border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {([
            { id: 'artistas', label: 'Artistas', icon: <BsPeopleFill className="w-4 h-4" /> },
            { id: 'publicaciones', label: 'Publicaciones', icon: <FiHeart className="w-4 h-4" /> },
            { id: 'eventos', label: 'Eventos', icon: <FiCalendar className="w-4 h-4" /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-riff-primary border-riff-primary'
                  : 'text-white/60 border-transparent hover:text-white hover:border-white/30'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ARTISTAS */}
        {activeTab === 'artistas' && (
          <div className="space-y-10">
            {/* Buscador resultado */}
            {search && (
              <div>
                <h2 className="text-white text-xl font-bold mb-4">
                  Resultados para &ldquo;{search}&rdquo;
                </h2>
                {loadingArtists ? <ArtistsSkeleton /> : filteredArtists.length === 0 ? (
                  <EmptyState icon={<BsPeopleFill className="w-12 h-12" />} message="No se encontraron artistas" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredArtists.map(artist => (
                      <ArtistCard
                        key={artist.id}
                        artist={artist}
                        followersCount={followersMap.has(artist.id) ? followersMap.get(artist.id) : artist.followersCount}
                        isFollowing={isFollowing(artist.id)}
                        isLoggedIn={!!user}
                        isSelf={user?.id === artist.id}
                        onToggleFollow={() => toggleFollow(artist.id)}
                        fullWidth
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Artistas Destacados */}
            {!search && (
              <ArtistScrollSection
                title="Artistas Destacados"
                artists={filteredArtists}
                followersMap={followersMap}
                isFollowing={isFollowing}
                isLoggedIn={!!user}
                currentUserId={user?.id}
                onToggleFollow={toggleFollow}
                loading={loadingArtists}
              />
            )}

            {/* Tus artistas (seguidos) */}
            {!search && user && followedArtists.length > 0 && (
              <ArtistScrollSection
                title="Tus artistas"
                artists={followedArtists}
                followersMap={followersMap}
                isFollowing={isFollowing}
                isLoggedIn={!!user}
                currentUserId={user?.id}
                onToggleFollow={toggleFollow}
                loading={false}
              />
            )}
          </div>
        )}

        {/* PUBLICACIONES */}
        {activeTab === 'publicaciones' && (
          <div>
            <h2 className="text-white text-xl font-bold mb-6">Últimas publicaciones</h2>
            {loadingPosts ? (
              <PostsSkeleton />
            ) : enrichedPosts.length === 0 ? (
              <EmptyState icon={<FiHeart className="w-12 h-12" />} message="No hay publicaciones aún" />
            ) : (
              <div className="space-y-4">
                {enrichedPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isLoggedIn={!!user}
                    isLiking={likingId === post.id}
                    onLike={handleLike}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* EVENTOS */}
        {activeTab === 'eventos' && (
          <div>
            <h2 className="text-white text-xl font-bold mb-6">Próximos eventos</h2>
            {loadingEvents ? (
              <EventsSkeleton />
            ) : enrichedEvents.length === 0 ? (
              <EmptyState icon={<FiCalendar className="w-12 h-12" />} message="No hay eventos próximos" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {enrichedEvents.map(event => (
                  <HomeEventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-componentes ── */

function ArtistScrollSection({
  title, artists, followersMap, isFollowing, isLoggedIn, currentUserId, onToggleFollow, loading,
}: {
  title: string;
  artists: { id: string; name: string; biography?: string | null; profileImage?: string | null; followersCount?: number }[];
  followersMap: Map<string, number>;
  isFollowing: (id: string) => boolean;
  isLoggedIn: boolean;
  currentUserId?: string;
  onToggleFollow: (id: string) => void;
  loading: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -900 : 900, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-bold">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full border border-riff-primary text-riff-primary flex items-center justify-center hover:bg-riff-primary/10 transition-all"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full border border-riff-primary text-riff-primary flex items-center justify-center hover:bg-riff-primary/10 transition-all"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <ArtistsSkeleton />
      ) : artists.length === 0 ? (
        <EmptyState icon={<BsPeopleFill className="w-12 h-12" />} message="No se encontraron artistas" />
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {artists.map(artist => (
            <ArtistCard
              key={artist.id}
              artist={artist}
              followersCount={followersMap.has(artist.id) ? followersMap.get(artist.id) : artist.followersCount}
              isFollowing={isFollowing(artist.id)}
              isLoggedIn={isLoggedIn}
              isSelf={currentUserId === artist.id}
              onToggleFollow={() => onToggleFollow(artist.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ArtistCard({
  artist, followersCount, isFollowing, isLoggedIn, isSelf, onToggleFollow, fullWidth,
}: {
  artist: { id: string; name: string; biography?: string | null; profileImage?: string | null; followersCount?: number };
  followersCount: number | undefined;
  isFollowing: boolean;
  isLoggedIn: boolean;
  isSelf: boolean;
  onToggleFollow: () => void;
  fullWidth?: boolean;
}) {
  const initial = artist.name.charAt(0).toUpperCase();
  const [imgError, setImgError] = useState(false);
  const displayFollowers = followersCount !== undefined && followersCount !== null
    ? `${followersCount.toLocaleString()} ${followersCount === 1 ? 'seguidor' : 'seguidores'}`
    : null;

  const showImage = artist.profileImage && !imgError;

  return (
    <div className={`bg-riff-header rounded-lg border border-white/5 hover:border-riff-primary/30 transition-all p-5 flex flex-col gap-3 ${fullWidth ? 'w-full' : 'flex-shrink-0 w-72'}`}>

      {/* Fila superior: avatar + nombre + seguidores */}
      <Link href={`/artist/${artist.id}`} className="flex items-center gap-3 w-full min-w-0">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-riff-primary-dark to-riff-primary flex items-center justify-center">
          {showImage ? (
            <img
              src={artist.profileImage!}
              alt={artist.name}
              width={56}
              height={56}
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span className="text-white text-xl font-bold select-none">{initial}</span>
          )}
        </div>

        {/* Nombre + seguidores */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-white font-bold text-sm leading-tight line-clamp-2 hover:text-riff-primary transition-colors">
            {artist.name}
          </span>
          {displayFollowers !== null && (
            <span className="text-white/50 text-xs mt-0.5">{displayFollowers}</span>
          )}
        </div>
      </Link>

      {/* Biografía */}
      {artist.biography && (
        <p className="text-white/50 text-xs line-clamp-2 leading-relaxed">{artist.biography}</p>
      )}

      {/* Botones */}
      <div className="flex gap-2 mt-auto pt-1">
        <Link
          href={`/artist/${artist.id}`}
          className="flex-1 text-center py-2 text-xs font-medium text-white/70 border border-white/20 rounded-md hover:border-riff-primary/50 hover:text-white transition-all"
        >
          Ver perfil
        </Link>
        {isLoggedIn && !isSelf && (
          <button
            onClick={onToggleFollow}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
              isFollowing
                ? 'bg-white/10 text-white/70 hover:bg-red-500/20 hover:text-red-400 border border-white/20'
                : 'bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white hover:opacity-90'
            }`}
          >
            {isFollowing ? 'Siguiendo' : 'Seguir'}
          </button>
        )}
      </div>
    </div>
  );
}

function PostCard({
  post, isLoggedIn, isLiking, onLike,
}: {
  post: HomePost; isLoggedIn: boolean; isLiking: boolean;
  onLike: (id: string) => void;
}) {
  return (
    <div className="bg-riff-header rounded-sm p-4 border border-white/5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/artist/${post.authorId}`} className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-riff-primary-dark to-riff-primary flex items-center justify-center">
            {post.authorImage ? (
              <Image src={post.authorImage} alt={post.authorName} width={36} height={36} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-sm font-bold">{post.authorName.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </Link>
        <div>
          <Link href={`/artist/${post.authorId}`}>
            <span className="text-white font-semibold text-sm hover:text-riff-primary transition-colors">{post.authorName}</span>
          </Link>
          <p className="text-white/50 text-xs">{post.time}</p>
        </div>
      </div>

      {/* Contenido */}
      {post.content && (
        <p className="text-white/90 text-sm leading-relaxed mb-3 line-clamp-3">{post.content}</p>
      )}

      {/* Imagen */}
      {post.image && (
        <div className="mb-3 rounded-sm overflow-hidden">
          <Image src={post.image} alt="Post" width={800} height={400} className="w-full h-48 object-cover" />
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-4 pt-3 border-t border-white/5">
        <button
          disabled={!isLoggedIn || isLiking}
          onClick={() => isLoggedIn && onLike(post.id)}
          className={`flex items-center gap-1.5 text-sm transition-all ${
            !isLoggedIn
              ? 'text-white/40 cursor-default'
              : post.isLiked
                ? 'text-red-400 hover:text-red-300'
                : 'text-white/50 hover:text-red-400'
          }`}
          title={!isLoggedIn ? 'Inicia sesión para reaccionar' : ''}
        >
          {post.isLiked
            ? <AiFillHeart className="w-5 h-5" />
            : <AiOutlineHeart className="w-5 h-5" />
          }
          <span>{post.likes}</span>
        </button>
        <span className="text-white/30 text-xs ml-auto">{post.date}</span>
      </div>
    </div>
  );
}

function HomeEventCard({ event }: { event: HomeEvent }) {
  return (
    <div className="bg-riff-header rounded-sm p-4 border border-white/5 hover:border-riff-primary/30 transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-white font-semibold text-sm leading-tight">{event.title}</h3>
        {event.status && (
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
            event.status === 'upcoming' ? 'bg-riff-primary/20 text-riff-primary'
            : event.status === 'sold_out' ? 'bg-red-500/20 text-red-400'
            : 'bg-white/10 text-white/50'
          }`}>
            {event.status === 'upcoming' ? 'Próximo' : event.status === 'sold_out' ? 'Sold out' : event.status}
          </span>
        )}
      </div>

      {event.description && (
        <p className="text-white/60 text-xs line-clamp-2">{event.description}</p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <FiMapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{event.location || 'Sin ubicación'}</span>
        </div>
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <FiCalendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{event.date}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <div className="w-5 h-5 rounded-full bg-riff-primary/20 flex items-center justify-center flex-shrink-0">
          <FiMusic className="w-3 h-3 text-riff-primary" />
        </div>
        <Link href={`/artist/${event.organizerId}`} className="text-white/60 text-xs hover:text-riff-primary transition-colors truncate">
          {event.organizerName}
        </Link>
      </div>
    </div>
  );
}

/* ── Skeletons ── */
function ArtistsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-riff-header rounded-sm p-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-2 bg-white/10 rounded w-1/2" />
            </div>
          </div>
          <div className="h-8 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

function PostsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-riff-header rounded-sm p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 bg-white/10 rounded w-1/3" />
              <div className="h-2 bg-white/10 rounded w-1/5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-white/10 rounded" />
            <div className="h-3 bg-white/10 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-riff-header rounded-sm p-4 animate-pulse space-y-3">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/10 rounded w-full" />
          <div className="space-y-2">
            <div className="h-3 bg-white/10 rounded w-1/2" />
            <div className="h-3 bg-white/10 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-white/40">
      <div className="mb-4">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

