'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FiBookmark, FiSettings } from 'react-icons/fi';
import { CgProfile } from "react-icons/cg";
import { BiImages } from "react-icons/bi";
import { MdOutlineQueryStats } from "react-icons/md";
import { IoIosLogOut, IoIosCalendar } from "react-icons/io";
import { useLogout } from '@/app/hooks/useLogout';
import type { UserData } from '@/app/hooks/useUser';

interface SidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  user?: UserData | null;
}

export default function Sidebar({ activeSection = 'perfil', onSectionChange, user }: SidebarProps) {
  const [active, setActive] = useState(activeSection);
  const { handleLogout } = useLogout();

  const handleSectionChange = (section: string) => {
    setActive(section);
    onSectionChange?.(section);
  };

  const menuItems = [
    { id: 'perfil', label: 'Mi perfil', icon: CgProfile },
    { id: 'publicaciones', label: 'Publicaciones', icon: BiImages },
    { id: 'eventos', label: 'Eventos', icon: IoIosCalendar },
    { id: 'guardados', label: 'Guardados', icon: FiBookmark },
    { id: 'estadisticas', label: 'Estadísticas', icon: MdOutlineQueryStats },
    { id: 'configuracion', label: 'Configuración', icon: FiSettings },
  ];

  return (
    <aside className="hidden md:flex group w-16 hover:w-64 bg-linear-to-b from-riff-card to-riff-header border border-white/10 rounded-2xl flex-col transition-all duration-300 ease-in-out shadow-lg sticky top-24 self-start">
      {/* User Info */}
      <div className="py-5 px-3 overflow-hidden">
        {/* Top line */}
        <div className="w-10 h-0.5 bg-linear-to-r from-riff-primary-dark to-riff-primary mx-auto mb-4 rounded-full"></div>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-riff-text-secondary/30 shrink-0 mx-auto group-hover:mx-0 flex items-center justify-center">
            {user?.profileImage ? (
              <Image
                src={user.profileImage}
                alt={user.name || 'Perfil'}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <div className="flex-2 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-white font-semibold text-sm truncate whitespace-nowrap">
              {user?.name || 'Cargando...'}
            </h3>
            <p className="text-riff-text-secondary text-xs truncate whitespace-nowrap">
              {user?.role === 'ARTIST' ? 'Artista' : 'Usuario'}
            </p>
          </div>
        </div>
        
        {/* Bottom line */}
        <div className="w-10 h-0.5 bg-linear-to-r from-riff-primary-dark to-riff-primary mx-auto mt-4 rounded-full"></div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-2">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleSectionChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all duration-200
                    ${isActive 
                      ? 'text-riff-primary' 
                      : 'text-white hover:text-riff-primary'
                    }`}
                >
                  <Icon className="w-6 h-6 shrink-0" />
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
      <div className="p-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-white hover:text-riff-primary transition-all duration-200 border border-white/20"
        >
          <IoIosLogOut className="w-6 h-6 shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  );
}
