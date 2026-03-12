'use client';

import { useState } from 'react';
import { FaTimes, FaLink, FaYoutube, FaSoundcloud, FaSpotify } from 'react-icons/fa';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-riff-overlay/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-riff-header border border-riff-border rounded-xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white text-lg font-semibold">Agregar canción</h2>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-riff-card border border-riff-border flex items-center justify-center text-white/60 hover:text-white hover:border-riff-primary/50 transition-colors"
          >
            <FaTimes className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Título</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre de la canción"
              className="w-full bg-riff-card border border-riff-border rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-riff-primary/60 transition-colors"
            />
          </div>

          {/* Enlace */}
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Enlace de la canción</label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="Pega el enlace de YouTube, SoundCloud, Spotify..."
                className="w-full bg-riff-card border border-riff-border rounded-lg px-3 py-2.5 pr-10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-riff-primary/60 transition-colors"
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

            <p className="mt-1.5 text-white/30 text-xs flex items-center gap-1.5 flex-wrap">
              Soportado:
              <FaYoutube className="w-3 h-3 text-[#FF0000]" />
              <FaSoundcloud className="w-3 h-3 text-[#FF5500]" />
              <FaSpotify className="w-3 h-3 text-[#1DB954]" />
              <span>Bandcamp</span>
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-white/70 text-sm mb-1.5">
              Descripción <span className="text-white/30">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Cuéntale algo a tu audiencia sobre esta canción..."
              rows={2}
              className="w-full bg-riff-card border border-riff-border rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-riff-primary/60 transition-colors resize-none"
            />
          </div>

          {/* Checkbox derechos */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input type="checkbox" checked={rightsConfirmed} onChange={e => setRightsConfirmed(e.target.checked)} className="sr-only" />
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  rightsConfirmed
                    ? 'bg-riff-primary border-riff-primary'
                    : 'border-riff-border bg-riff-card group-hover:border-riff-primary/50'
                }`}
              >
                {rightsConfirmed && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-white/50 text-xs leading-relaxed">
              Confirmo que soy el titular de los derechos de este contenido o cuento con autorización para publicarlo. Entiendo que publicar contenido sin autorización puede resultar en la eliminación de la publicación.
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-riff-delete-2 text-xs bg-riff-delete/10 border border-riff-delete/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-riff-card border border-transparent hover:border-riff-border transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading || !title.trim() || !url.trim() || !rightsConfirmed}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
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