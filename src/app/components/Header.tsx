'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiSearch, FiUser } from 'react-icons/fi';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-riff-header  backdrop-blur-md">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/images/logo_riff.png"
              alt="Riff Logo"
              width={70}
              height={35}
              className="object-contain transition-transform group-hover:scale-105"
            />
          </Link>

            {/* Búsqueda */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden sm:block">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
              type="text"
              placeholder="Descubre nuevos artistas"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-gray-400 
                     focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary focus:bg-white/10 
                     transition-all duration-300"
              />
            </div>
            </form>

          {/* Navegación */}
          <nav className="flex items-center gap-8">
            <Link 
              href="/" 
              className="text-riff-primary font-semibold hover:text-riff-secondary transition-colors relative
                         "
            >
              Inicio
            </Link>

            <Link 
              href="/perfil" 
              className="flex items-center gap-2 text-gray-300 font-medium hover:text-white transition-colors"
            >
              
              <span className="hidden sm:inline">Perfil</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
