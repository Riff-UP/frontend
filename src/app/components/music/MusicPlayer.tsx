'use client';

import { useState } from 'react';
import {
  FaYoutube, FaSoundcloud, FaSpotify, FaBandcamp, FaExternalLinkAlt,
} from 'react-icons/fa';

export type MusicProvider = 'youtube' | 'soundcloud' | 'spotify' | 'bandcamp' | string;

interface MusicPlayerProps {
  provider: MusicProvider;
  embedUrl: string;
  originalUrl?: string;
}

const PROVIDER_CONFIG: Record<string, {
  label: string;
  Icon: React.ElementType;
  color: string;
  iframeHeight: string;
}> = {
  youtube: {
    label: 'YouTube',
    Icon: FaYoutube,
    color: '#FF0000',
    iframeHeight: '200px',
  },
  soundcloud: {
    label: 'SoundCloud',
    Icon: FaSoundcloud,
    color: '#FF5500',
    iframeHeight: '120px',
  },
  spotify: {
    label: 'Spotify',
    Icon: FaSpotify,
    color: '#1DB954',
    iframeHeight: '80px',
  },
  bandcamp: {
    label: 'Bandcamp',
    Icon: FaBandcamp,
    color: '#1DA0C3',
    iframeHeight: '80px',
  },
};

export default function MusicPlayer({ provider, embedUrl, originalUrl }: MusicPlayerProps) {
  const [loaded, setLoaded] = useState(false);
  const cfg = PROVIDER_CONFIG[provider] ?? {
    label: provider,
    Icon: FaExternalLinkAlt,
    color: '#888888',
    iframeHeight: '80px',
  };
  const { Icon } = cfg;

  // Bandcamp: no hay embed predecible → link card
  if (provider === 'bandcamp') {
    return (
      <a
        href={originalUrl ?? embedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-lg bg-riff-header hover:bg-riff-border transition-colors group border border-riff-border"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-riff-card">
          <Icon style={{ color: cfg.color }} className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/50 text-xs">Escuchar en</p>
          <p className="text-white text-sm font-medium">{cfg.label}</p>
        </div>
        <FaExternalLinkAlt className="w-3 h-3 text-white/30 group-hover:text-riff-primary transition-colors" />
      </a>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden bg-riff-card border border-riff-border">
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
        <Icon style={{ color: cfg.color }} className="w-3 h-3" />
        <span className="text-white/40 text-xs">{cfg.label}</span>
      </div>

      {!loaded && (
        <div
          className="w-full animate-pulse bg-riff-header flex items-center justify-center"
          style={{ height: cfg.iframeHeight }}
        >
          <Icon style={{ color: cfg.color + '55' }} className="w-7 h-7" />
        </div>
      )}

      <iframe
        src={embedUrl}
        style={{
          width: '100%',
          height: cfg.iframeHeight,
          border: 'none',
          display: loaded ? 'block' : 'none',
        }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        onLoad={() => setLoaded(true)}
        title={`${cfg.label} player`}
      />
    </div>
  );
}