'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';
import { API_BASE_URL } from '@/app/config/api';
import { getValidToken, getUserFromToken } from '@/app/utils/jwt';
import { resolveProfileImage } from '@/app/utils/avatar';

interface HeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
}

export default function Header({ onSearch, searchValue }: HeaderProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const pathname = usePathname();

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
      return;
    }
    setIsAuthenticated(true);
    try {
      const tokenData = getUserFromToken(token);
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const resolvedName = data.name ?? tokenData?.name ?? '';
        const resolvedEmail = data.email ?? tokenData?.email ?? '';
        setProfileImage(resolveProfileImage(data.profileImage, resolvedEmail || resolvedName));
        setUserName(resolvedName);
      }
    } catch { /* silencioso */ }
  };

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInternalQuery(value);
    if (onSearch) onSearch(value); // dispara en cada keystroke
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // evitar recarga, la búsqueda ya ocurrió en onChange
  };

  const initial = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-40 w-full bg-riff-header backdrop-blur-md">
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
            <Link
              href="/"
              className={`text-sm sm:text-base font-semibold transition-colors relative ${
                pathname === '/' ? 'text-riff-primary' : 'text-riff-background hover:text-riff-primary'
              }`}
            >
              Inicio
            </Link>
            {isAuthenticated ? (
              <Link
                href="/profile"
                className={`flex items-center gap-2 text-sm sm:text-base font-semibold transition-colors ${
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