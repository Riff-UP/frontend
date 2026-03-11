import Image from 'next/image';
import { IoMdClose } from 'react-icons/io';
import { FiHeart } from 'react-icons/fi';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import { Publication } from '@/app/types';

interface PublicationModalProps {
  publication: Publication | null;
  authorName: string;
  authorImage?: string | null;
  isSaving?: boolean;
  onClose: () => void;
  onLike: (id: string | number) => void;
  onSave: (id: string | number) => void;
  formatDate: (date: string) => string;
}

export default function PublicationModal({
  publication,
  authorName,
  authorImage,
  isSaving = false,
  onClose,
  onLike,
  onSave,
  formatDate,
}: PublicationModalProps) {
  if (!publication) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-riff-header rounded-sm w-full max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: solo visible en móvil (arriba de la imagen) */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-riff-primary-dark to-riff-primary rounded-full flex items-center justify-center shrink-0 overflow-hidden">
              {authorImage ? (
                <Image src={authorImage} alt={authorName} width={40} height={40} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-sm font-medium">{authorName.charAt(0)}</span>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{authorName}</h3>
              <p className="text-white/60 text-xs">{formatDate(publication.date)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-riff-primary hover:text-riff-primary/80 transition-colors shrink-0">
            <IoMdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Imagen */}
        {publication.image && (
          <div className="bg-black flex items-center justify-center overflow-hidden md:flex-1">
            <Image
              src={publication.image}
              alt="Imagen de publicación"
              width={800}
              height={800}
              className="w-full h-full object-contain max-h-[50vh] md:max-h-[90vh]"
              unoptimized
            />
          </div>
        )}

        {/* Panel derecho (desktop) / sección inferior (móvil): header + descripción + acciones */}
        <div className={`flex flex-col ${publication.image ? 'md:w-72 lg:w-80' : 'w-full'} overflow-hidden`}>
          {/* Header: solo visible en desktop (dentro del panel derecho) */}
          <div className="hidden md:flex items-center justify-between p-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-riff-primary-dark to-riff-primary rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                {authorImage ? (
                  <Image src={authorImage} alt={authorName} width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-medium">{authorName.charAt(0)}</span>
                )}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{authorName}</h3>
                <p className="text-white/60 text-xs">{formatDate(publication.date)}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-riff-primary hover:text-riff-primary/80 transition-colors shrink-0">
              <IoMdClose className="w-6 h-6" />
            </button>
          </div>

          {/* Descripción */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
              {publication.content}
            </p>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-4 p-4 border-t border-white/10 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onLike(publication.id); }}
              className={`flex items-center gap-2 transition-colors ${
                publication.isLiked ? 'text-red-400' : 'text-riff-text-secondary hover:text-red-400'
              }`}
            >
              <FiHeart className={`w-6 h-6 ${publication.isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{publication.likes}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSave(publication.id); }}
              disabled={isSaving}
              className={`flex items-center gap-2 transition-all duration-200 ${
                isSaving
                  ? 'opacity-50 cursor-wait'
                  : publication.isSaved
                    ? 'text-yellow-400 hover:text-yellow-300'
                    : 'text-riff-text-secondary hover:text-yellow-400'
              }`}
              title={publication.isSaved ? 'Quitar de guardados' : 'Guardar publicación'}
            >
              {publication.isSaved ? <BsBookmarkFill className="w-6 h-6" /> : <BsBookmark className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
