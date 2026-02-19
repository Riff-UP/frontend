'use client';

import { useState } from 'react';
import MusicPlayer from './music/MusicPlayer';
import SongListItem from './music/SongListItem';
import AddSongModal from './music/AddSongModal';
import { MdFileUpload } from "react-icons/md";

export default function Music() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);

  const handlePlaySong = (songId: string) => {
    // TODO: Implementar lógica de reproducción
    const song = songs.find(s => s.id === songId);
    if (song) {
      setCurrentSong(song);
    }
  };

  const handleEditSong = (songId: string) => {
    // TODO: Implementar lógica de edición
    console.log('Editando canción:', songId);
  };

  const handleDeleteSong = (songId: string) => {
    // TODO: Implementar lógica de eliminación con confirmación
    console.log('Eliminando canción:', songId);
  };

  const handleAddSong = (songData: any) => {
    // TODO: Implementar lógica para agregar canción
    console.log('Agregando canción:', songData);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl sm:text-2xl font-bold mb-2">Música</h2>
          <p className="text-white/80 text-xs sm:text-sm">
            Reproduce y administra tu contenido
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white text-sm font-medium rounded-sm hover:from-riff-primary
           hover:to-riff-primary-dark transition-all duration-200 flex items-center gap-2"
        >
          <MdFileUpload className="w-4 h-4" />
          <span className="hidden sm:inline">Subir</span>
        </button>
      </div>

      {/* Music Player */}
      <MusicPlayer currentSong={currentSong} />

      {/* Songs List */}
      <div>
        <h3 className="text-white text-lg font-bold mb-4">Mis canciones</h3>
        
        {songs.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-riff-card to-riff-header rounded-lg border border-white/10">
            <p className="text-white/60">No tienes canciones aún</p>
          </div>
        ) : (
          <div className="space-y-3">
            {songs.map((song) => (
              <SongListItem
                key={song.id}
                song={song}
                onPlay={handlePlaySong}
                onEdit={handleEditSong}
                onDelete={handleDeleteSong}
                isPlaying={currentSong?.id === song.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Song Modal */}
      <AddSongModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddSong}
      />
    </div>
  );
}
