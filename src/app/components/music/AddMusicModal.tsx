'use client';

import { useState } from 'react';
import { IoMdClose } from 'react-icons/io';
import {  FaLink, FaYoutube, FaSoundcloud, FaSpotify } from 'react-icons/fa';

interface AddMusicModalProps {
  isOpen: boolean;
  isUploading: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; url: string; description?: string }) => Promise<void>;
}

function detectProviderClient(url: string): 'youtube' | 'soundcloud' | 'spotify' | 'bandcamp' | null {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/soundcloud\.com/.test(url)) return 'soundcloud';
  if (/open\.spotify\.com/.test(url)) return 'spotify';
  if (/bandcamp\.com/.test(url)) return 'bandcamp';
  return null;
}

const PROVIDER_LABELS: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  youtube:    { label: 'YouTube',    color: '#FF0000', Icon: FaYoutube    },
  soundcloud: { label: 'SoundCloud', color: '#FF5500', Icon: FaSoundcloud },
  spotify:    { label: 'Spotify',    color: '#1DB954', Icon: FaSpotify    },
  bandcamp:   { label: 'Bandcamp',   color: '#1DA0C3', Icon: FaLink       },
};

export default function AddMusicModal({ isOpen, isUploading, onClose, onSubmit }: AddMusicModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const detectedProvider = url.trim() ? detectProviderClient(url.trim()) : null;
  const providerCfg = detectedProvider ? PROVIDER_LABELS[detectedProvider] : null;

  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) { setError('El título es requerido.'); return; }
    if (!url.trim())   { setError('Pega el enlace de tu canción.'); return; }
    if (!detectedProvider) {
      setError('Enlace no reconocido. Usa YouTube, SoundCloud, Spotify o Bandcamp.');
      return;
    }
    if (!rightsConfirmed) {
      setError('Debes confirmar que tienes los derechos sobre este contenido.');
      return;
    }
    await onSubmit({ title: title.trim(), url: url.trim(), description: description.trim() || undefined });
    setTitle(''); setUrl(''); setDescription(''); setRightsConfirmed(false); setError('');
  };

  const handleClose = () => {
    setTitle(''); setUrl(''); setDescription(''); setRightsConfirmed(false); setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      {/* Modal */}
      <div className="bg-riff-header border border-white/20 rounded-lg w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <h2 className="text-white text-lg sm:text-xl font-semibold">Agregar canción</h2>
          <button
            onClick={handleClose}
            className="text-riff-primary hover:text-riff-primary/80 transition-colors"
          >
            <IoMdClose className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-white text-sm mb-2">Título</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre de la canción"
              className="w-full px-3 py-2 bg-riff-text-primary border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary transition-all duration-200"
            />
          </div>

          {/* Enlace */}
          <div>
            <label className="block text-white text-sm mb-2">Enlace de la canción</label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="Pega el enlace de YouTube, SoundCloud, Spotify..."
                className="w-full px-3 py-2 pr-9 bg-riff-text-primary border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary transition-all duration-200"
              />
              {providerCfg ? (
                <providerCfg.Icon
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: providerCfg.color }}
                />
              ) : (
                <FaLink className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              )}
            </div>

            {providerCfg && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <providerCfg.Icon className="w-3 h-3" style={{ color: providerCfg.color }} />
                <span className="text-xs" style={{ color: providerCfg.color }}>
                  {providerCfg.label} detectado
                </span>
              </div>
            )}

            <p className="mt-1.5 text-riff-text-secondary text-xs flex items-center gap-1.5 flex-wrap">
              Soportado:
              <FaYoutube className="w-3 h-3 text-[#FF0000]" />
              <FaSoundcloud className="w-3 h-3 text-[#FF5500]" />
              <FaSpotify className="w-3 h-3 text-[#1DB954]" />
              <span>Bandcamp</span>
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-white text-sm mb-2">
              Descripción <span className="text-riff-text-secondary text-xs">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Cuéntale algo a tu audiencia sobre esta canción..."
              rows={3}
              className="w-full px-3 py-2 bg-riff-text-primary border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary transition-all duration-200 resize-none"
            />
          </div>

          {/* Checkbox derechos */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input type="checkbox" checked={rightsConfirmed} onChange={e => setRightsConfirmed(e.target.checked)} className="sr-only" />
              <div
                className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                  rightsConfirmed
                    ? 'bg-riff-primary border-riff-primary'
                    : 'border-white/20 bg-riff-text-primary/40 group-hover:border-riff-primary/50'
                }`}
              >
                {rightsConfirmed && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-riff-text-secondary text-xs leading-relaxed">
              Confirmo que soy el titular de los derechos de este contenido o cuento con autorización para publicarlo. Entiendo que publicar contenido sin autorización puede resultar en la eliminación de la publicación.
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-sm px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 sm:p-6 border-t border-white/10">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="flex-1 px-4 py-2.5 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading || !title.trim() || !url.trim() || !rightsConfirmed}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-riff-primary-dark to-riff-primary hover:from-riff-primary hover:to-riff-primary-dark text-white text-sm font-medium rounded-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Subiendo...
              </>
            ) : 'Subir'}
          </button>
        </div>
      </div>
    </div>
  );
}