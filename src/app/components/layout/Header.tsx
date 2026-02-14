'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FiSearch, FiUser } from 'react-icons/fi';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-riff-header  backdrop-blur-md">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center group flex-shrink-0">
            <Image
              src="/images/logo_riff.png"
              alt="Riff Logo"
              width={60}
              height={30}
              className="object-contain transition-transform group-hover:scale-105 sm:w-[70px] sm:h-[35px]"
            />
          </Link>

            {/* Búsqueda */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
              <FiSearch className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-riff-background/60" />
              <input
              type="text"
              placeholder="Descubre artistas"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-12 pr-2 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base bg-riff-text-secondary/30 border border-white/10 rounded-sm text-white placeholder-riff-background/60
                     focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary focus:bg-white/10 
                     transition-all duration-300"
              />
            </div>
            </form>

          {/* Navegación */}
          <nav className="flex items-center gap-3 sm:gap-8">
            <Link 
              href="/" 
              className={`text-sm sm:text-base font-semibold transition-colors relative ${
                pathname === '/' 
                  ? 'text-riff-primary' 
                  : 'text-riff-background hover:text-riff-primary'
              }`}
            >
              Inicio
            </Link>

            <Link 
              href="/profile" 
              className={`flex items-center gap-2 text-sm sm:text-base font-semibold transition-colors ${
                pathname === '/profile' 
                  ? 'text-riff-primary' 
                  : 'text-riff-background hover:text-riff-primary'
              }`}
            >
              <span>Perfil</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
