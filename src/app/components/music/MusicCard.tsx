'use client';

import { useState } from 'react';
import { FaPlay, FaPause, FaBookmark, FaRegBookmark } from 'react-icons/fa';
import MusicPlayer from './MusicPlayer';
import { Publication } from '@/app/types';

interface MusicCardProps {
  post: Publication;
  artistName: string;
  artistImage?: string;
  isActive: boolean;           // ¿es la canción seleccionada actualmente?
  isSaved: boolean;
  onSelect: (post: Publication) => void;
  onSave?: (postId: string | number) => void;
  formatDate?: (date: string) => string;
}

export default function MusicCard({
  post, artistName, artistImage, isActive, isSaved, onSelect, onSave, formatDate,
}: MusicCardProps) {
  const embedUrl = post.content ?? '';
  const originalUrl = post.provider_meta?.provider_url ?? embedUrl;
  const provider = post.provider ?? 'soundcloud';

  return (
    <div
      className={`flex flex-col rounded-lg overflow-hidden transition-colors border ${
        isActive
          ? 'border-riff-primary/40 bg-riff-primary/10'
          : 'border-white/5 bg-white/5 hover:bg-white/[0.08]'
      }`}
    >
      {/* ── Row principal ── */}
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Thumbnail */}
        <div className="relative w-11 h-11 rounded flex-shrink-0 overflow-hidden bg-white/10">
          {artistImage ? (
            <img src={artistImage} alt={artistName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">♪</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-snug truncate">{post.title}</p>
          <p className="text-white/50 text-xs truncate">{artistName}</p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Play / Pause */}
          <button
            onClick={() => onSelect(post)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isActive
                ? 'bg-riff-primary text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            {isActive ? (
              <FaPause className="w-3 h-3" />
            ) : (
              <FaPlay className="w-3 h-3 ml-0.5" />
            )}
          </button>

          {/* Guardar */}
          {onSave && (
            <button
              onClick={() => onSave(post.id)}
              className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
            >
              {isSaved ? (
                <FaBookmark className="w-3.5 h-3.5 text-riff-primary" />
              ) : (
                <FaRegBookmark className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Player embed (solo cuando está activo) ── */}
      {isActive && embedUrl && (
        <div className="px-3 pb-3">
          <MusicPlayer provider={provider} embedUrl={embedUrl} originalUrl={originalUrl} />
        </div>
      )}
    </div>
  );
}