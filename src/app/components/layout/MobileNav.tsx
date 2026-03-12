'use client';

import { CgProfile } from "react-icons/cg";
import { BiImages } from "react-icons/bi";
import { MdOutlineLibraryMusic, MdOutlineQueryStats } from "react-icons/md";
import { IoIosCalendar } from "react-icons/io";
import { FiBookmark } from 'react-icons/fi';

interface MobileNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function MobileNav({ activeSection, onSectionChange }: MobileNavProps) {
  const menuItems = [
    { id: 'perfil', label: 'Perfil', icon: CgProfile },
    { id: 'publicaciones', label: 'Posts', icon: BiImages },
    { id: 'eventos', label: 'Eventos', icon: IoIosCalendar },
    { id: 'musica', label: 'Música', icon: MdOutlineLibraryMusic },
    { id: 'guardados', label: 'Guardados', icon: FiBookmark },
    { id: 'estadisticas', label: 'Stats', icon: MdOutlineQueryStats },
  ];

  return (
    <nav className="md:hidden sticky top-16 bg-gradient-to-b from-riff-card to-riff-header border-b border-white/10 z-10 mb-4">
      <div className="flex justify-around">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              title={item.label}
              className={`flex-1 flex flex-col items-center py-2.5 transition-colors duration-200 border-b-2 ${
                isActive
                  ? 'text-riff-primary border-riff-primary'
                  : 'text-white/60 border-transparent hover:text-riff-primary'
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}

      </div>
    </nav>
  );
}
