'use client';

import { FaPlay, FaEdit, FaTrash } from 'react-icons/fa';
import { HiOutlineClock } from 'react-icons/hi';
import Image from 'next/image';

interface SongListItemProps {
  song: {
    id: string;
    title: string;
    artist: string;
    cover: string;
    duration: number;
    plays?: number;
  };
  onPlay: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isPlaying?: boolean;
}

export default function SongListItem({ 
  song, 
  onPlay, 
  onEdit, 
  onDelete,
  isPlaying = false 
}: SongListItemProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-br from-riff-card to-riff-header rounded-lg border border-white/10 hover:border-riff-primary/30 transition-all duration-300">
      {/* Cover Image */}
      <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0">
        <Image
          src={song.cover}
          alt={song.title}
          fill
          className="object-cover"
        />
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-semibold text-sm sm:text-base truncate ${
          isPlaying ? 'text-riff-primary' : 'text-white'
        }`}>
          {song.title}
        </h4>
        <p className="text-white/60 text-xs sm:text-sm truncate">{song.artist}</p>
      </div>

      {/* Duration */}
      <div className="hidden sm:flex items-center gap-1 text-white/60 text-sm">
        <HiOutlineClock className="w-4 h-4" />
        <span>{formatTime(song.duration)}</span>
      </div>

      {/* Plays Count */}
      {song.plays !== undefined && (
        <div className="hidden md:flex items-center gap-1 text-white/60 text-sm">
          <FaPlay className="w-3 h-3" />
          <span>{song.plays}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPlay(song.id)}
          className="p-2 sm:p-2.5 rounded-full bg-riff-primary hover:bg-riff-secondary transition-colors"
          aria-label="Reproducir"
        >
          <FaPlay className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
        </button>
        
        <button
          onClick={() => onEdit(song.id)}
          className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-riff-secondary transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Editar"
        >
          <FaEdit className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
        </button>
        
        <button
          onClick={() => onDelete(song.id)}
          className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-riff-delete transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Eliminar"
        >
          <FaTrash className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
