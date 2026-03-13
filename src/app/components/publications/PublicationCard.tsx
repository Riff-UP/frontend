import Image from 'next/image';
import { FiHeart } from 'react-icons/fi';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import { Publication } from '@/app/types';

interface PublicationCardProps {
  publication: Publication;
  authorName: string;
  authorImage?: string | null;
  isSaving?: boolean;
  onLike: (id: string | number) => void;
  onSave: (id: string | number) => void;
  onClick?: (publication: Publication) => void;
  formatDate?: (date: string) => string;
}

function safeFormatDate(date: string): string {
  if (!date) return '';
  // Si ya tiene formato dd/mm/yyyy retornar tal cual
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return date;
  // Si es ISO o cualquier formato parseable por Date
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('es-ES');
  }
  return date;
}

export default function PublicationCard({
  publication,
  authorName,
  authorImage,
  isSaving = false,
  onLike,
  onSave,
  onClick,
  formatDate,
}: PublicationCardProps) {
  const displayDate = formatDate ? formatDate(publication.date) : safeFormatDate(publication.date);
  const isVideoPublication = publication.mediaType === 'video' || publication.type === 'video';

  return (
    <div
      onClick={() => onClick?.(publication)}
      className={`bg-riff-header rounded-sm overflow-hidden h-full flex flex-col ${
        onClick ? 'cursor-pointer border border-transparent hover:border-riff-primary/50 transition-all' : ''
      }`}
    >
      <div className="p-4 flex-1 flex flex-col">
        {/* Author Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-riff-primary-dark to-riff-primary rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
            {authorImage ? (
              <Image src={authorImage} alt={authorName} width={32} height={32} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-medium">{authorName.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-col gap-1">
              <span className="text-white font-semibold text-base">{authorName}</span>
              <span className="text-white text-xs">{displayDate}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <p className="text-white text-base leading-relaxed mb-3 line-clamp-4 flex-1">
          {publication.content}
        </p>

        {publication.image && (
          <div className="bg-riff-header mb-3 relative w-full h-48 rounded-sm overflow-hidden">
            {isVideoPublication ? (
              <video
                src={publication.image}
                controls
                preload="metadata"
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={publication.image}
                alt="Imagen de publicación"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                unoptimized
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(publication.id);
            }}
            className={`flex items-center gap-2 transition-colors ${
              publication.isLiked ? 'text-red-400' : 'text-riff-text-secondary hover:text-red-400'
            }`}
          >
            <FiHeart className={`w-6 h-6 ${publication.isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs">{publication.likes}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave(publication.id);
            }}
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
            {publication.isSaved ? (
              <BsBookmarkFill className="w-6 h-6" />
            ) : (
              <BsBookmark className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
