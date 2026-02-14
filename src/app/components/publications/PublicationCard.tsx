import { FiHeart } from 'react-icons/fi';
import { MdBookmark, MdBookmarkBorder } from 'react-icons/md';
import { Publication } from '@/app/types';

interface PublicationCardProps {
  publication: Publication;
  authorName: string;
  savedCount?: number;
  onLike: (id: number) => void;
  onSave: (id: number) => void;
  onClick?: (publication: Publication) => void;
  formatDate: (date: string) => string;
}

export default function PublicationCard({
  publication,
  authorName,
  savedCount = 0,
  onLike,
  onSave,
  onClick,
  formatDate,
}: PublicationCardProps) {
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
          <div className="w-8 h-8 bg-gradient-to-br from-riff-primary-dark to-riff-primary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">{authorName.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <div className="flex flex-col gap-1">
              <span className="text-white font-semibold text-base">{authorName}</span>
              <span className="text-white text-xs">{formatDate(publication.date)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <p className="text-white text-base leading-relaxed mb-3 line-clamp-4 flex-1">
          {publication.content}
        </p>

        {publication.image && (
          <div className="mb-3">
            <div className="w-full h-40 bg-riff-header rounded-sm flex items-center justify-center">
              <span className="text-riff-text-secondary text-sm">Imagen del evento</span>
            </div>
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
            className={`flex items-center gap-2 transition-colors ${
              publication.isSaved ? 'text-yellow-400' : 'text-riff-text-secondary hover:text-yellow-400'
            }`}
          >
            {publication.isSaved ? (
              <MdBookmark className="w-6 h-6" />
            ) : (
              <MdBookmarkBorder className="w-6 h-6" />
            )}
            <span className="text-xs">{savedCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
