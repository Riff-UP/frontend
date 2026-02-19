'use client';

import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (songData: any) => void;
  editingSong?: {
    id: string;
    title: string;
    audioFile?: string;
    cover?: string;
  } | null;
}

export default function AddSongModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  editingSong 
}: AddSongModalProps) {
  const [title, setTitle] = useState(editingSong?.title || '');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Validar datos y procesar archivos
    const songData = {
      title,
      audioFile,
      coverImage,
    };

    onSubmit(songData);
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setAudioFile(null);
    setCoverImage(null);
    onClose();
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-riff-header to-riff-card rounded-lg border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <h2 className="text-white text-lg sm:text-xl font-bold">
            {editingSong ? 'Editar canción' : 'Agregar canción'}
          </h2>
          <button
            onClick={handleClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Title */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-riff-card border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-riff-primary transition-colors"
              placeholder="Nombre de la canción"
              required
            />
          </div>

          {/* Audio File */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Archivo de audio
            </label>
            <div className="relative">
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                className="hidden"
                id="audio-upload"
              />
              <label
                htmlFor="audio-upload"
                className="block w-full px-4 py-2.5 bg-riff-primary hover:bg-riff-secondary text-white text-center rounded-lg cursor-pointer transition-colors"
              >
                {audioFile ? audioFile.name : 'Seleccionar canción'}
              </label>
            </div>
            {audioFile && (
              <p className="text-white/60 text-xs mt-2">
                Archivo seleccionado: {audioFile.name}
              </p>
            )}
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Portada
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
                id="cover-upload"
              />
              <label
                htmlFor="cover-upload"
                className="block w-full px-4 py-2.5 bg-riff-primary hover:bg-riff-secondary text-white text-center rounded-lg cursor-pointer transition-colors"
              >
                {coverImage ? coverImage.name : 'Seleccionar imagen'}
              </label>
            </div>
            {coverImage && (
              <p className="text-white/60 text-xs mt-2">
                Imagen seleccionada: {coverImage.name}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-riff-save to-riff-save-2 hover:opacity-90 text-white rounded-lg transition-opacity"
            >
              {editingSong ? 'Guardar' : 'Subir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
