import { IoMdClose } from 'react-icons/io';
import { FiHeart } from 'react-icons/fi';
import { MdBookmark, MdBookmarkBorder } from 'react-icons/md';
import { Publication } from '@/app/types';

interface PublicationModalProps {
  publication: Publication | null;
  authorName: string;
  savedCount?: number;
  onClose: () => void;
  onLike: (id: number) => void;
  onSave: (id: number) => void;
  formatDate: (date: string) => string;
}

export default function PublicationModal({
  publication,
  authorName,
  savedCount = 0,
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
        className="bg-riff-header rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 sticky top-0 bg-riff-header z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-riff-primary-dark to-riff-primary rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">{authorName.charAt(0)}</span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">{authorName}</h3>
              <p className="text-white/60 text-xs">{formatDate(publication.date)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-riff-primary hover:text-riff-primary/80 transition-colors"
          >
            <IoMdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6">
          {publication.image && (
            <div className="mb-4">
              <div className="w-full bg-riff-header rounded-sm overflow-hidden">
                <div className="aspect-video flex items-center justify-center">
                  <span className="text-riff-text-secondary">Imagen del evento</span>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <p className="text-white text-base leading-relaxed whitespace-pre-wrap">
              {publication.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4">
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
              <span className="text-sm">{publication.likes}</span>
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
              <span className="text-sm">{savedCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
