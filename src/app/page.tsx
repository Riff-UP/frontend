"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/app/components/layout/Header";
import Footer from "@/app/components/layout/Footer";
import ArtistCard from "@/app/components/cards/ArtistCard";
import EventRatingModal from "@/app/components/common/EventRatingModal";
import { useEventRating } from "@/app/hooks/useEventRating";
import { usePostReactions } from "@/app/hooks/usePostReactions";
import { FaCircleChevronLeft, FaCircleChevronRight } from "react-icons/fa6";
import { BsBookmark, BsBookmarkFill, BsHeart, BsHeartFill } from "react-icons/bs";
import { useArtists, ArtistData } from "@/app/hooks/useArtists";
import { useUser } from "@/app/hooks/useUser";
import { useFollow } from "@/app/hooks/useFollow";
import { API_BASE_URL, getAuthHeaders } from "@/app/config/api";

const API_URL = API_BASE_URL;

interface RawPost {
  _id?: unknown;
  id?: unknown;
  sql_user_id?: string;
  authorId?: string;
  type?: string;
  mediaType?: string;
  media_url?: string;
  imageUrl?: string;
  resourceType?: string;
  mimeType?: string;
  title?: string;
  description?: string;
  content?: string;
  mediaUrl?: string;
  likesCount?: number;
  likes_count?: number;
  createdAt?: string;
  created_at?: string;
}

interface HeroPublication {
  id: string;
  authorId: string;
  authorName: string;
  authorImage?: string;
  mediaUrl: string | undefined;
  mediaType: 'video' | 'image' | 'text';
  caption: string;
  likesCount: number;
  createdAt: string;
}

interface CarouselControls {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

interface SavedPostRow {
  id: string;
  postId: string;
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

function normalizeMediaUrl(raw?: string): string | undefined {
  if (!raw) return undefined;

  const trimmed = raw.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return undefined;
  if (trimmed.startsWith("data:")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;

  const apiOrigin = API_URL.replace(/\/api$/, "");
  if (trimmed.startsWith("/")) return `${apiOrigin}${trimmed}`;
  return `${apiOrigin}/${trimmed}`;
}

function getPostMediaUrl(post: RawPost): string | undefined {
  const explicit = normalizeMediaUrl(post.mediaUrl ?? post.media_url ?? post.imageUrl);
  if (explicit) return explicit;

  const hasExplicitMediaType =
    post.type === 'video' || post.mediaType === 'video'
    || post.type === 'image' || post.mediaType === 'image'
    || post.resourceType === 'video' || post.resourceType === 'image';

  if (!hasExplicitMediaType) return undefined;
  if (!post.content) return undefined;

  const maybeUrl = post.content.trim();
  if (maybeUrl.startsWith("http") || maybeUrl.startsWith("/") || maybeUrl.startsWith("//")) {
    return normalizeMediaUrl(maybeUrl);
  }

  return undefined;
}

function inferMediaTypeFromUrl(url?: string): 'video' | 'image' | 'text' {
  if (!url) return 'text';
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.includes('/video/upload/')) return 'video';
  if (/\.(mp4|m4v|mov|webm|avi)$/i.test(cleanUrl)) return 'video';
  if (/\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i.test(cleanUrl)) return 'image';
  return 'text';
}

function getPostMediaType(post: RawPost, mediaUrl?: string): 'video' | 'image' | 'text' {
  if (post.type === 'video' || post.mediaType === 'video' || post.resourceType === 'video') return 'video';
  if (post.type === 'image' || post.mediaType === 'image' || post.resourceType === 'image') return 'image';
  if (post.mimeType?.startsWith('video/')) return 'video';
  if (post.mimeType?.startsWith('image/')) return 'image';
  if (!mediaUrl) return 'text';
  return inferMediaTypeFromUrl(mediaUrl);
}

function getPostCaption(post: RawPost): string {
  const rawContent = post.content?.trim() ?? "";
  const contentLooksLikeUrl = rawContent.startsWith("http") || rawContent.startsWith("/");
  return post.description?.trim()
    || post.title?.trim()
    || (!contentLooksLikeUrl ? rawContent : "")
    || "Sin descripción";
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [heroPosts, setHeroPosts] = useState<RawPost[]>([]);
  const { artists, loading, setSearch } = useArtists();
  const { user } = useUser();
  const { isFollowing } = useFollow(user?.id);
  const {
    isLiked,
    toggleLike,
    processingPostId: likingPostId,
    postReactionCounts,
    fetchPostReactionCounts,
    getReactionCount,
  } = usePostReactions(user?.id);
  const [savedPosts, setSavedPosts] = useState<SavedPostRow[]>([]);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<{ message: string; tone: 'success' | 'error'; visible: boolean } | null>(null);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveToastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followedArtists = artists.filter(a => isFollowing(a.id));
  const carouselRef = useRef<HTMLDivElement>(null);
  const followedCarouselRef = useRef<HTMLDivElement>(null);
  const [discoverControls, setDiscoverControls] = useState<CarouselControls>({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const [followedControls, setFollowedControls] = useState<CarouselControls>({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const getControlsState = (element: HTMLDivElement | null): CarouselControls => {
    if (!element) return { canScrollLeft: false, canScrollRight: false };
    const epsilon = 2;
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    return {
      canScrollLeft: element.scrollLeft > epsilon,
      canScrollRight: element.scrollLeft < maxScrollLeft - epsilon,
    };
  };

  const updateDiscoverControls = () => {
    setDiscoverControls(getControlsState(carouselRef.current));
  };

  const updateFollowedControls = () => {
    setFollowedControls(getControlsState(followedCarouselRef.current));
  };

  const showSaveToast = (message: string, tone: 'success' | 'error' = 'success') => {
    setSaveToast({ message, tone, visible: true });
    if (saveToastTimerRef.current) {
      clearTimeout(saveToastTimerRef.current);
    }
    if (saveToastHideTimerRef.current) {
      clearTimeout(saveToastHideTimerRef.current);
    }
    saveToastTimerRef.current = setTimeout(() => {
      setSaveToast((prev) => (prev ? { ...prev, visible: false } : null));
      saveToastTimerRef.current = null;
    }, 1500);

    saveToastHideTimerRef.current = setTimeout(() => {
      setSaveToast(null);
      saveToastHideTimerRef.current = null;
    }, 1850);
  };

  const getLikeCountForPost = (postId: string, fallback: number): number => {
    return postReactionCounts.has(postId) ? getReactionCount(postId) : fallback;
  };

  const handleToggleLike = async (postId: string) => {
    if (!user?.id) {
      alert('Debes iniciar sesión para reaccionar');
      showSaveToast('Inicia sesión para reaccionar', 'error');
      return;
    }

    const result = await toggleLike(postId);
    showSaveToast(result.liked ? 'Te gusta esta publicación' : 'Ya no te gusta', 'success');
  };

  const scrollFollowedCarousel = (dir: 'left' | 'right') => {
    if (!followedCarouselRef.current) return;
    const card = followedCarouselRef.current.querySelector('article') as HTMLElement | null;
    const cardWidth = card ? card.offsetWidth + 16 : 280;
    followedCarouselRef.current.scrollBy({ left: dir === 'right' ? cardWidth : -cardWidth, behavior: 'smooth' });
    window.setTimeout(updateFollowedControls, 250);
  };

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const card = carouselRef.current.querySelector('article') as HTMLElement | null;
    const cardWidth = card ? card.offsetWidth + 16 : 280;
    carouselRef.current.scrollBy({ left: dir === 'right' ? cardWidth : -cardWidth, behavior: 'smooth' });
    window.setTimeout(updateDiscoverControls, 250);
  };

  const formatPostDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const allPublications = useMemo<HeroPublication[]>(() => {
    const artistMap = new Map(artists.map((artist) => [artist.id, artist]));
    const artistIds = new Set(artists.map((artist) => artist.id));

    const normalized = heroPosts
      .map((post) => {
        const mediaUrl = getPostMediaUrl(post);
        const authorId = String(post.sql_user_id ?? post.authorId ?? "");
        const createdAt = post.createdAt ?? post.created_at ?? "";
        const mediaType = getPostMediaType(post, mediaUrl);

        return {
          id: extractId(post._id ?? post.id),
          authorId,
          authorName: artistMap.get(authorId)?.name ?? "Artista Riff",
          authorImage: artistMap.get(authorId)?.profileImage ?? undefined,
          mediaUrl,
          mediaType,
          caption: getPostCaption(post),
          likesCount: Number(post.likesCount ?? post.likes_count ?? 0),
          createdAt,
        };
      })
      .filter((post) => Boolean(post.id)) as HeroPublication[];

    const uniqueById = normalized.filter(
      (post, index, arr) => arr.findIndex((item) => item.id === post.id) === index
    );

    const sorted = [...uniqueById].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const artistPosts = sorted.filter((post) => artistIds.has(post.authorId));
    return artistPosts.length > 0 ? artistPosts : sorted;
  }, [artists, heroPosts]);

  const recentPublications = useMemo(() => allPublications.slice(0, 4), [allPublications]);

  const mixedFeed = useMemo(() => {
    if (allPublications.length === 0) return [] as HeroPublication[];

    const followedArtistIds = new Set(followedArtists.map((artist) => artist.id));
    const followedQueue = allPublications.filter((post) => followedArtistIds.has(post.authorId));
    const rest = allPublications.filter((post) => !followedArtistIds.has(post.authorId));

    const videos = rest.filter((post) => post.mediaType === 'video');
    const images = rest.filter((post) => post.mediaType === 'image');
    const texts = rest.filter((post) => post.mediaType === 'text');

    const result: HeroPublication[] = [];
    const pattern: Array<'video' | 'image' | 'text' | 'image'> = ['video', 'image', 'text', 'image'];
    let index = 0;

    const pickByType = (type: 'video' | 'image' | 'text'): HeroPublication | undefined => {
      if (type === 'video' && videos.length > 0) return videos.shift();
      if (type === 'image' && images.length > 0) return images.shift();
      if (type === 'text' && texts.length > 0) return texts.shift();
      return undefined;
    };

    while (videos.length > 0 || images.length > 0 || texts.length > 0) {
      const desired = pattern[index % pattern.length];
      const picked = pickByType(desired)
        ?? videos.shift()
        ?? images.shift()
        ?? texts.shift();

      if (!picked) break;
      result.push(picked);

      if (result.length % 4 === 0 && followedQueue.length > 0) {
        const followedPost = followedQueue.shift();
        if (followedPost) result.push(followedPost);
      }

      index += 1;
    }

    if (followedQueue.length > 0) {
      result.push(...followedQueue);
    }

    return result;
  }, [allPublications, followedArtists]);

  const isPostSaved = (postId: string): boolean => {
    return savedPosts.some((item) => String(item.postId) === String(postId));
  };

  const loadSavedPosts = async () => {
    if (!user?.id) {
      setSavedPosts([]);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setSavedPosts([]);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/posts/saved?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok) return;

      const data = await res.json();
      const rows: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.savedPosts)
            ? data.savedPosts
            : [];

      const normalized: SavedPostRow[] = rows
        .map((row) => {
          const rawId = row.savedPostId ?? row._id ?? row.id ?? row.savedId;
          const postObj = (row.post ?? row.postData ?? row.publication) as Record<string, unknown> | undefined;
          const rawPostId = row.post_id ?? row.postId ?? row.postID ?? postObj?._id ?? postObj?.id ?? row.post;

          return {
            id: extractId(rawId),
            postId: extractId(rawPostId),
          };
        })
        .filter((row) => row.id && row.postId);

      setSavedPosts(normalized);
    } catch {
      setSavedPosts([]);
    }
  };

  const handleToggleSave = async (postId: string) => {
    if (!postId || postId === 'undefined' || postId === 'null') return;
    if (!user?.id) {
      alert('Debes iniciar sesión para guardar publicaciones');
      showSaveToast('Inicia sesión para guardar publicaciones', 'error');
      return;
    }
    if (savingPostId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Debes iniciar sesión para guardar publicaciones');
      showSaveToast('Inicia sesión para guardar publicaciones', 'error');
      return;
    }

    setSavingPostId(postId);
    try {
      const existing = savedPosts.find((row) => String(row.postId) === String(postId));

      if (existing) {
        setSavedPosts((prev) => prev.filter((row) => row.id !== existing.id));
        const delRes = await fetch(`${API_URL}/posts/saved/${existing.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!delRes.ok && delRes.status !== 404) {
          await loadSavedPosts();
          showSaveToast('No se pudo quitar de guardados', 'error');
        } else {
          showSaveToast('Publicación quitada de guardados', 'success');
        }
      } else {
        const payloads: Record<string, string>[] = [
          { postId, userId: user.id },
          { post_id: postId, sql_user_id: user.id },
          { postId, userId: user.id, post_id: postId, sql_user_id: user.id, user_id: user.id },
        ];

        let createRes: Response | null = null;
        for (const payload of payloads) {
          const attempt = await fetch(`${API_URL}/posts/saved`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          createRes = attempt;

          if (attempt.status === 409 || attempt.ok) break;
          if (attempt.status !== 400 && attempt.status !== 415 && attempt.status !== 422) break;
        }

        if (!createRes) {
          await loadSavedPosts();
          showSaveToast('No se pudo guardar la publicación', 'error');
          return;
        }

        if (createRes.status === 409) {
          await loadSavedPosts();
          showSaveToast('La publicación ya estaba guardada', 'success');
        } else if (createRes.ok) {
          const raw = await createRes.json().catch(() => ({})) as Record<string, unknown>;
          const row = (raw.data ?? raw.savedPost ?? raw.result ?? raw) as Record<string, unknown>;
          const createdId = extractId(row._id ?? row.savedPostId ?? row.id);
          const createdPostId = extractId(row.post_id ?? row.postId ?? postId);

          if (createdId && createdPostId) {
            setSavedPosts((prev) => {
              if (prev.some((item) => String(item.postId) === String(createdPostId))) return prev;
              return [...prev, { id: createdId, postId: createdPostId }];
            });
            showSaveToast('Publicación guardada', 'success');
          } else {
            await loadSavedPosts();
            showSaveToast('Publicación guardada', 'success');
          }
        } else {
          await loadSavedPosts();
          showSaveToast('No se pudo guardar la publicación', 'error');
        }
      }
    } catch {
      await loadSavedPosts();
      showSaveToast('Error al actualizar guardados', 'error');
    } finally {
      setSavingPostId(null);
    }
  };

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

  useEffect(() => {
    updateDiscoverControls();
    updateFollowedControls();

    const onResize = () => {
      updateDiscoverControls();
      updateFollowedControls();
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [artists.length, followedArtists.length, loading]);

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

  useEffect(() => {
    loadSavedPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const ids = allPublications.map((p) => p.id).filter(Boolean);
    if (ids.length > 0) {
      fetchPostReactionCounts(ids);
    }
  }, [allPublications, fetchPostReactionCounts]);

  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current) {
        clearTimeout(saveToastTimerRef.current);
      }
      if (saveToastHideTimerRef.current) {
        clearTimeout(saveToastHideTimerRef.current);
      }
    };
  }, []);

  // 👇 AQUÍ ESTÁ EL CAMBIO MAGISTRAL
  // Ya no le pasamos el arreglo falso 'attendedEvents', 
  // el hook se encarga solito de llamar a nuestro nuevo endpoint del backend
  const { eventToRate, handleRatingSubmit, handleRatingClose } = useEventRating();

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

          <div className="relative z-10 h-full flex items-start pt-4 sm:pt-8 lg:pt-2 px-4 sm:px-8 md:px-12 lg:px-6">
            <div className="max-w-xl lg:max-w-2xl">
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
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Descubre Nuevos Artistas'}
            </h2>
            <div className="hidden sm:flex gap-2">
              <button
                onClick={() => scrollCarousel('left')}
                disabled={!discoverControls.canScrollLeft}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center group ${
                  discoverControls.canScrollLeft ? '' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <FaCircleChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-riff-primary group-hover:text-riff-primary-dark transition-colors" />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                disabled={!discoverControls.canScrollRight}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center group ${
                  discoverControls.canScrollRight ? '' : 'opacity-40 cursor-not-allowed'
                }`}
              >
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
            <div
              ref={carouselRef}
              onScroll={updateDiscoverControls}
              className="flex gap-4 overflow-x-auto sm:overflow-x-hidden scroll-smooth px-4 sm:px-0 pb-2 snap-x snap-proximity overscroll-x-contain"
            >
              {artists.map((artist: ArtistData) => (
                <div
                  key={artist.id}
                  className="w-[85%] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] xl:w-[calc(25%-12px)] flex-shrink-0 snap-start"
                >
                  <ArtistCard
                    id={artist.id}
                    name={artist.name}
                    image={artist.profileImage ?? undefined}
                    followers={artist.followersCount ?? 0}
                    description={artist.biography ?? undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Publicaciones Recientes */}
        <section className="max-w-8xl mx-auto px-4 sm:px-4 lg:px-0 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Publicaciones recientes</h2>
            {recentPublications.length > 0 && (
              <span className="text-riff-text-secondary text-xs sm:text-sm">4 destacadas</span>
            )}
          </div>

          {recentPublications.length === 0 ? (
            <p className="text-riff-text-secondary py-8">Aún no hay publicaciones recientes.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {recentPublications.map((publication) => (
                <article key={`recent-${publication.id}`} className="bg-riff-header rounded-sm border border-white/5 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-riff-primary/20 overflow-hidden flex items-center justify-center text-riff-primary font-semibold">
                        {publication.authorImage ? (
                          <Image
                            src={publication.authorImage}
                            alt={publication.authorName}
                            width={36}
                            height={36}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          publication.authorName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{publication.authorName}</p>
                        <p className="text-riff-text-secondary text-xs">{formatPostDate(publication.createdAt)}</p>
                      </div>
                    </div>

                    {publication.mediaUrl && publication.mediaType !== 'text' && (
                      <div className="overflow-hidden rounded-sm mb-3 bg-black/30 relative h-44">
                        {publication.mediaType === 'video' ? (
                          <video src={publication.mediaUrl} controls preload="metadata" className="w-full h-44 object-cover" />
                        ) : (
                          <Image
                            src={publication.mediaUrl}
                            alt="Post reciente"
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                            unoptimized
                          />
                        )}
                      </div>
                    )}

                    {publication.mediaType === 'text' ? (
                      <div className="mb-3 h-44 rounded-sm bg-white/[0.03] border border-white/10 p-4 flex items-center">
                        <p className="text-white/90 text-base leading-relaxed line-clamp-5">
                          {publication.caption || 'Publicación sin texto.'}
                        </p>
                      </div>
                    ) : publication.caption ? (
                      <p className="text-white/90 text-sm leading-relaxed line-clamp-3 mb-3">{publication.caption}</p>
                    ) : null}

                    <div className="flex items-center justify-end gap-4 text-riff-text-secondary text-xs">
                      <button
                        onClick={() => handleToggleLike(publication.id)}
                        disabled={likingPostId === publication.id}
                        className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${
                          isLiked(publication.id) ? 'text-red-400' : 'text-riff-text-secondary hover:text-red-400'
                        }`}
                        aria-label="Me gusta"
                      >
                        {isLiked(publication.id) ? <BsHeartFill className="w-4 h-4" /> : <BsHeart className="w-4 h-4" />}
                        {getLikeCountForPost(publication.id, publication.likesCount)}
                      </button>
                      <button
                        onClick={() => handleToggleSave(publication.id)}
                        disabled={savingPostId === publication.id}
                        className="text-riff-text-secondary hover:text-yellow-400 transition-colors disabled:opacity-50"
                        aria-label="Guardar publicación"
                      >
                        {isPostSaved(publication.id) ? (
                          <BsBookmarkFill className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <BsBookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Artistas que sigues */}
        {user && followedArtists.length > 0 && (
          <section className="max-w-8xl mx-auto px-0 sm:px-4 lg:px-0 py-6 sm:py-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8 px-4 sm:px-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Tus Artistas</h2>
              <div className="hidden sm:flex gap-2">
                <button
                  onClick={() => scrollFollowedCarousel('left')}
                  disabled={!followedControls.canScrollLeft}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center group ${
                    followedControls.canScrollLeft ? '' : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <FaCircleChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-riff-primary group-hover:text-riff-primary-dark transition-colors" />
                </button>
                <button
                  onClick={() => scrollFollowedCarousel('right')}
                  disabled={!followedControls.canScrollRight}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center group ${
                    followedControls.canScrollRight ? '' : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <FaCircleChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-riff-primary group-hover:text-riff-primary-dark transition-colors" />
                </button>
              </div>
            </div>
            <div
              ref={followedCarouselRef}
              onScroll={updateFollowedControls}
              className="flex gap-4 overflow-x-auto sm:overflow-x-hidden scroll-smooth px-4 sm:px-0 pb-2 snap-x snap-proximity overscroll-x-contain"
            >
              {followedArtists.map((artist: ArtistData) => (
                <div key={artist.id} className="w-[85%] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] xl:w-[calc(25%-12px)] flex-shrink-0 snap-start">
                  <ArtistCard
                    id={artist.id}
                    name={artist.name}
                    image={artist.profileImage ?? undefined}
                    followers={artist.followersCount ?? 0}
                    description={artist.biography ?? undefined}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Feed Mixto */}
        <section className="max-w-8xl mx-auto px-4 sm:px-4 lg:px-0 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Feed mixto</h2>
            <span className="text-riff-text-secondary text-xs sm:text-sm">Videos, fotos y texto</span>
          </div>

          {mixedFeed.length === 0 ? (
            <p className="text-riff-text-secondary py-8">Sin contenido para mostrar en el feed.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {mixedFeed.map((publication, index) => (
                <article
                  key={`mix-${publication.id}-${index}`}
                  className={`rounded-sm border overflow-hidden ${
                    publication.mediaType === 'video'
                      ? 'bg-black/60 border-riff-primary/40'
                      : publication.mediaType === 'image'
                        ? 'bg-riff-header border-white/5'
                        : 'bg-riff-card border-white/10'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{publication.authorName}</p>
                        <p className="text-riff-text-secondary text-xs">{formatPostDate(publication.createdAt)}</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full border border-white/20 text-white/80 uppercase tracking-wide">
                        {publication.mediaType === 'video' ? 'Video' : publication.mediaType === 'image' ? 'Foto' : 'Texto'}
                      </span>
                    </div>

                    {publication.mediaUrl && publication.mediaType !== 'text' ? (
                      <div className="overflow-hidden rounded-sm mb-3 bg-black/30 relative h-52">
                        {publication.mediaType === 'video' ? (
                          <video src={publication.mediaUrl} controls preload="metadata" className="w-full h-52 object-cover" />
                        ) : (
                          <Image
                            src={publication.mediaUrl}
                            alt="Publicación"
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            unoptimized
                          />
                        )}
                      </div>
                    ) : (
                      <div className="mb-3 h-52 rounded-sm bg-white/[0.03] border border-white/10 p-4 flex items-center">
                        <p className="text-white/90 text-base leading-relaxed line-clamp-6">
                          {publication.caption || 'Publicación sin texto.'}
                        </p>
                      </div>
                    )}

                    {publication.mediaType !== 'text' && publication.caption && (
                      <p className="text-white/85 text-sm leading-relaxed line-clamp-3 mb-3">{publication.caption}</p>
                    )}

                    <div className="flex items-center justify-between text-riff-text-secondary text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleLike(publication.id)}
                          disabled={likingPostId === publication.id}
                          className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${
                            isLiked(publication.id) ? 'text-red-400' : 'text-riff-text-secondary hover:text-red-400'
                          }`}
                          aria-label="Me gusta"
                        >
                          {isLiked(publication.id) ? <BsHeartFill className="w-4 h-4" /> : <BsHeart className="w-4 h-4" />}
                          {getLikeCountForPost(publication.id, publication.likesCount)}
                        </button>
                      </div>
                      <button
                        onClick={() => handleToggleSave(publication.id)}
                        disabled={savingPostId === publication.id}
                        className="text-riff-text-secondary hover:text-yellow-400 transition-colors disabled:opacity-50"
                        aria-label="Guardar publicación"
                      >
                        {isPostSaved(publication.id) ? (
                          <BsBookmarkFill className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <BsBookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
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

      {saveToast && (
        <div
          className={`fixed bottom-4 right-4 z-50 pointer-events-none transition-all duration-300 ${
            saveToast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <div
            className={`rounded-sm border px-4 py-2 text-sm shadow-lg ${
              saveToast.tone === 'success'
                ? 'bg-riff-header border-green-500/40 text-green-200'
                : 'bg-riff-header border-red-500/40 text-red-200'
            }`}
          >
            {saveToast.message}
          </div>
        </div>
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