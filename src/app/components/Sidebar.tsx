'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiUser, FiFileText, FiCalendar, FiMusic, FiBookmark, FiLogOut } from 'react-icons/fi';

interface SidebarProps {
  activeSection?: string;
}

export default function Sidebar({ activeSection = 'perfil' }: SidebarProps) {
  const [active, setActive] = useState(activeSection);

  const menuItems = [
    { id: 'perfil', label: 'Mi perfil', icon: FiUser },
    { id: 'publicaciones', label: 'Publicaciones', icon: FiFileText },
    { id: 'eventos', label: 'Eventos', icon: FiCalendar },
    { id: 'musica', label: 'Música', icon: FiMusic },
    { id: 'guardados', label: 'Guardados', icon: FiBookmark },
  ];

  const handleLogout = () => {
    // Aquí iría la lógica de cierre de sesión
    console.log('Cerrar sesión');
  };

  return (
    <aside className="group w-16 hover:w-64 bg-gradient-to-b from-riff-header to-riff-card border border-white/10 rounded-xl flex flex-col transition-all duration-300 ease-in-out shadow-lg">
      {/* User Info */}
      <div className="p-3 border-b border-white/10 overflow-hidden rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-riff-text-secondary/30 flex-shrink-0">
            <Image
              src="/images/artist.jpg"
              alt="Usuario"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-white font-semibold text-sm truncate whitespace-nowrap">Bisonte</h3>
            <p className="text-riff-text-secondary text-xs truncate whitespace-nowrap">bisonte@gmail.com</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActive(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all duration-200 overflow-hidden
                    ${isActive 
                      ? 'bg-riff-primary text-white' 
                      : 'text-riff-text-secondary hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-riff-text-secondary hover:bg-white/5 hover:text-white transition-all duration-200 border border-white/10 overflow-hidden"
        >
          <FiLogOut className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  );
}
