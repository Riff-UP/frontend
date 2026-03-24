'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FiBell, FiSearch } from 'react-icons/fi';
import { FiMoon, FiSun } from 'react-icons/fi';
import { API_BASE_URL } from '@/app/config/api';
import { getValidToken, getUserFromToken } from '@/app/utils/jwt';
import { normalizeDisplayName, resolveProfileImage } from '@/app/utils/avatar';

interface HeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
}

interface NotificationItem {
  id: string;
  message: string;
  type: string;
  createdAt?: string;
  link?: string;
  unread: boolean;
}

const NOTIFICATIONS_TIMEOUT_MS = 10000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function normalizeNotificationPayload(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  const candidates = [record.data, record.items, record.notifications];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as Record<string, unknown>[];
    }
  }

  return [];
}

function normalizeNotification(item: Record<string, unknown>): NotificationItem {
  const id = String(item.id ?? item._id ?? crypto.randomUUID());
  const message = String(item.message ?? 'Nueva notificación');
  const type = String(item.type ?? 'notification');
  const createdAt = typeof item.createdAt === 'string'
    ? item.createdAt
    : typeof item.created_at === 'string'
      ? item.created_at
      : undefined;
  const link = typeof item.deepLink === 'string'
    ? item.deepLink
    : typeof item.postUrl === 'string'
      ? item.postUrl
      : typeof item.url === 'string'
        ? item.url
        : undefined;
  const unread = typeof item.read === 'boolean'
    ? !item.read
    : typeof item.isRead === 'boolean'
      ? !item.isRead
      : true;

  return { id, message, type, createdAt, link, unread };
}

function formatNotificationDate(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Header({ onSearch, searchValue }: HeaderProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const attrTheme = document.documentElement.getAttribute('data-theme');
    const savedTheme = localStorage.getItem('riff-theme');
    const initialTheme: 'dark' | 'light' = (savedTheme === 'light' || savedTheme === 'dark')
      ? savedTheme
      : (attrTheme === 'light' ? 'light' : 'dark');
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('riff-theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    }
    setTheme(nextTheme);
  };

  // Sincronizar con valor externo si viene del padre
  useEffect(() => {
    if (searchValue !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInternalQuery(searchValue);
    }
  }, [searchValue]);

  // Cargar datos del usuario (foto + nombre) cuando hay token
  const loadUserData = async () => {
    const token = getValidToken();
    if (!token) {
      setIsAuthenticated(false);
      setProfileImage(null);
      setUserName('');
      setCurrentUserId('');
      setNotifications([]);
      return;
    }
    setIsAuthenticated(true);
    try {
      const tokenData = getUserFromToken(token);
      const tokenDataRecord = (tokenData ?? null) as Record<string, unknown> | null;
      const tokenUserId = typeof tokenDataRecord?.userId === 'string'
        ? tokenDataRecord.userId
        : typeof tokenDataRecord?.sub === 'string'
          ? tokenDataRecord.sub
          : tokenData?.id;

      if (tokenUserId) {
        setCurrentUserId(String(tokenUserId));
      }

      const res = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const resolvedUserId = String(data.id ?? tokenData?.id ?? tokenUserId ?? '');
        const resolvedName = normalizeDisplayName(data.name ?? tokenData?.name, tokenData?.name || 'Usuario');
        const resolvedEmail = data.email ?? tokenData?.email ?? '';
        setProfileImage(resolveProfileImage(data.profileImage, resolvedEmail || resolvedName));
        setUserName(resolvedName);
        setCurrentUserId(resolvedUserId);
      }
    } catch { /* silencioso */ }
  };

  const loadNotifications = useCallback(async () => {
    const token = getValidToken();
    if (!token || !currentUserId) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // 1) Ruta dedicada por usuario
      let res = await fetchWithTimeout(
        `${API_BASE_URL}/notifications/user/${encodeURIComponent(currentUserId)}?page=1&limit=10`,
        { headers, cache: 'no-store' },
        NOTIFICATIONS_TIMEOUT_MS,
      );

      // 2) Fallback a listado filtrado por query si la ruta dedicada falla
      if (!res.ok) {
        res = await fetchWithTimeout(
          `${API_BASE_URL}/notifications?userIdReceiver=${encodeURIComponent(currentUserId)}&page=1&limit=10`,
          { headers, cache: 'no-store' },
          NOTIFICATIONS_TIMEOUT_MS,
        );
      }

      if (!res.ok) {
        throw new Error(`No se pudieron cargar las notificaciones (${res.status}).`);
      }

      const payload = await res.json();
      const list = normalizeNotificationPayload(payload).map(normalizeNotification);
      setNotifications(list);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setNotificationsError('La carga de notificaciones tardó demasiado. Intenta de nuevo.');
      } else {
        setNotificationsError(error instanceof Error ? error.message : 'Error cargando notificaciones.');
      }
    } finally {
      setNotificationsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUserData();
    window.addEventListener('storage', loadUserData);
    window.addEventListener('authChange', loadUserData);
    window.addEventListener('profileChange', loadUserData);
    return () => {
      window.removeEventListener('storage', loadUserData);
      window.removeEventListener('authChange', loadUserData);
      window.removeEventListener('profileChange', loadUserData);
    };
  }, [pathname]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationsRef.current) return;
      if (!notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInternalQuery(value);
    if (onSearch) onSearch(value); // dispara en cada keystroke
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // evitar recarga, la búsqueda ya ocurrió en onChange
  };

  const initial = userName ? userName.charAt(0).toUpperCase() : 'U';
  const unreadCount = notifications.filter((item) => item.unread).length;

  const handleToggleNotifications = () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      void loadNotifications();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full theme-shell-header theme-force-light-text backdrop-blur-md">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-8">
          <Link href="/" className="flex items-center group flex-shrink-0">
            <Image
              src="/images/logo_riff.png"
              alt="Riff Logo"
              width={60}
              height={30}
              className="object-contain transition-transform group-hover:scale-105 sm:w-[70px] sm:h-[35px]"
            />
          </Link>

          <form onSubmit={handleSubmit} className="flex-1 max-w-xl">
            <div className="relative">
              <FiSearch className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-riff-background/60" />
              <input
                type="text"
                placeholder="Descubre artistas"
                value={internalQuery}
                onChange={handleChange}
                className="w-full pl-9 sm:pl-12 pr-2 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base bg-riff-text-secondary/30 border border-white/10 rounded-sm text-white placeholder-riff-background/60 focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary focus:bg-white/10 transition-all duration-300"
              />
            </div>
          </form>

          <nav className="flex items-center gap-3 sm:gap-8">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-full text-riff-background hover:text-riff-primary hover:bg-white/10 transition-colors"
              aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}
              title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            >
              {theme === 'dark' ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
            </button>
            <Link
              href="/"
              className={`text-sm sm:text-base font-semibold transition-colors relative ${
                pathname === '/' ? 'text-riff-primary' : 'text-riff-background hover:text-riff-primary'
              }`}
            >
              Inicio
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="relative order-2" ref={notificationsRef}>
                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    className="relative p-1.5 rounded-full text-riff-background hover:text-riff-primary hover:bg-white/10 transition-colors"
                    aria-label="Abrir notificaciones"
                  >
                    <FiBell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-[320px] max-h-[420px] overflow-y-auto rounded-md border border-white/10 bg-riff-header shadow-xl z-50">
                      <div className="px-3 py-2 border-b border-white/10 text-sm text-white/90 font-semibold">
                        Notificaciones
                      </div>

                      {notificationsLoading ? (
                        <div className="px-3 py-4 text-sm text-white/60">Cargando...</div>
                      ) : notificationsError ? (
                        <div className="px-3 py-4 text-sm text-red-300">{notificationsError}</div>
                      ) : notifications.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-white/60">No tienes notificaciones.</div>
                      ) : (
                        <ul className="divide-y divide-white/10">
                          {notifications.map((item) => {
                            const dateLabel = formatNotificationDate(item.createdAt);
                            const content = (
                              <>
                                <div className="flex items-start gap-2">
                                  {item.unread && <span className="mt-1 w-2 h-2 rounded-full bg-riff-primary flex-shrink-0" />}
                                  <div className="min-w-0">
                                    <p className="text-sm text-white/90 leading-snug break-words">{item.message}</p>
                                    <p className="text-[11px] text-white/50 mt-1 uppercase tracking-wide">{item.type}</p>
                                    {dateLabel && <p className="text-[11px] text-white/40 mt-1">{dateLabel}</p>}
                                  </div>
                                </div>
                              </>
                            );

                            if (item.link?.startsWith('http://') || item.link?.startsWith('https://')) {
                              return (
                                <li key={item.id}>
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block px-3 py-3 hover:bg-white/5 transition-colors"
                                    onClick={() => setNotificationsOpen(false)}
                                  >
                                    {content}
                                  </a>
                                </li>
                              );
                            }

                            if (item.link?.startsWith('/')) {
                              return (
                                <li key={item.id}>
                                  <Link
                                    href={item.link}
                                    className="block px-3 py-3 hover:bg-white/5 transition-colors"
                                    onClick={() => setNotificationsOpen(false)}
                                  >
                                    {content}
                                  </Link>
                                </li>
                              );
                            }

                            return (
                              <li key={item.id} className="px-3 py-3">
                                {content}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  href="/profile"
                  className={`order-1 flex items-center gap-2 text-sm sm:text-base font-semibold transition-colors ${
                    pathname === '/profile' ? 'text-riff-primary' : 'text-riff-background hover:text-riff-primary'
                  }`}
                >
                  {/* Avatar del usuario */}
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-riff-primary-dark to-riff-primary flex items-center justify-center border border-white/20">
                    {profileImage ? (
                      <Image
                        src={profileImage}
                        alt={userName}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-xs font-bold">{initial}</span>
                    )}
                  </div>
                  <span className="hidden sm:inline truncate max-w-[120px]">{userName || 'Perfil'}</span>
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className={`flex items-center gap-2 text-sm sm:text-base font-semibold transition-colors ${
                  pathname === '/login' ? 'text-riff-primary' : 'text-riff-background hover:text-riff-primary'
                }`}
              >
                <span>Iniciar sesión</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}