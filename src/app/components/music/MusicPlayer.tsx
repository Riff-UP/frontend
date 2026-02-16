'use client';

import { useState } from 'react';
import { FaPlay, FaPause, FaStepBackward, FaStepForward } from 'react-icons/fa';
import { HiVolumeUp } from 'react-icons/hi';
import Image from 'next/image';

interface MusicPlayerProps {
  currentSong?: {
    id: string;
    title: string;
    artist: string;
    cover: string;
    duration: number;
    audioUrl: string;
  } | null;
}

export default function MusicPlayer({ currentSong }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // TODO: Implementar lógica de reproducción
  };

  const handlePrevious = () => {
    // TODO: Implementar canción anterior
  };

  const handleNext = () => {
    // TODO: Implementar siguiente canción
  };

  if (!currentSong) {
    return (
      <div className="bg-gradient-to-br from-riff-card to-riff-header rounded-lg p-4 sm:p-6 border border-white/10">
        <p className="text-white/60 text-center text-sm">No hay canción seleccionada</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-riff-card to-riff-header rounded-lg p-4 sm:p-6 border border-white/10">
      {/* Song Info */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={currentSong.cover}
            alt={currentSong.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-base sm:text-lg truncate">
            {currentSong.title}
          </h3>
          <p className="text-white/60 text-xs sm:text-sm truncate">
            {currentSong.artist}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white/60 text-xs">{formatTime(currentTime)}</span>
          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-riff-primary to-riff-secondary"
              style={{ width: `${(currentTime / currentSong.duration) * 100}%` }}
            />
          </div>
          <span className="text-white/60 text-xs">{formatTime(currentSong.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={handlePrevious}
            className="text-white hover:text-riff-primary transition-colors"
          >
            <FaStepBackward className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-riff-primary to-riff-secondary flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <FaPause className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : (
              <FaPlay className="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="text-white hover:text-riff-primary transition-colors"
          >
            <FaStepForward className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="hidden sm:flex items-center gap-2">
          <HiVolumeUp className="text-white/60 w-5 h-5" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-20 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #007BFF ${volume}%, rgba(255,255,255,0.2) ${volume}%)`
            }}
          />
        </div>
      </div>
    </div>
  );
}
