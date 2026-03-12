'use client';

import { FaPlay, FaPause, FaBookmark, FaRegBookmark } from 'react-icons/fa';
import MusicPlayer from './MusicPlayer';
import { Publication } from '@/app/types';

interface MusicCardProps {
  post: Publication;
  artistName: string;
  artistImage?: string;
  isActive: boolean;
  isSaved: boolean;
  onSelect: (post: Publication) => void;
  onSave?: (postId: string | number) => void;
}

export default function MusicCard({
  post, artistName, artistImage, isActive, isSaved, onSelect, onSave,
}: MusicCardProps) {
  const embedUrl = post.content ?? '';
  const originalUrl = post.provider_meta?.provider_url ?? embedUrl;
  const provider = post.provider ?? 'soundcloud';

  return (
    <div
      className={`flex flex-col rounded-lg overflow-hidden transition-colors border ${
        isActive
          ? 'border-riff-primary/50 bg-riff-overlay/30'
          : 'border-riff-border bg-riff-card hover:bg-riff-header'
      }`}
    >
      {/* Row principal */}
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Thumbnail */}
        <div className="relative w-11 h-11 rounded flex-shrink-0 overflow-hidden bg-riff-header">
          {artistImage ? (
            <img src={artistImage} alt={artistName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">♪</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-snug truncate">{post.title}</p>
          <p className="text-riff-text-secondary text-xs truncate">{artistName}</p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Play / Pause */}
          <button
            onClick={() => onSelect(post)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isActive
                ? 'bg-riff-primary text-white'
                : 'bg-riff-header text-white/70 hover:bg-riff-primary hover:text-white border border-riff-border'
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
              className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-riff-primary transition-colors"
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

      {/* Player embed (solo cuando está activo) */}
      {isActive && embedUrl && (
        <div className="px-3 pb-3">
          <MusicPlayer provider={provider} embedUrl={embedUrl} originalUrl={originalUrl} />
        </div>
      )}
    </div>
  );
}