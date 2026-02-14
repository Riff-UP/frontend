import Image from 'next/image';
import { BsThreeDots } from 'react-icons/bs';
import { AiOutlineHeart } from 'react-icons/ai';
import { BsBookmark } from 'react-icons/bs';
import { MdEdit, MdDelete } from 'react-icons/md';
import { Publication } from '@/app/types';

interface PublicationListCardProps {
  publication: Publication;
  isMenuOpen: boolean;
  isEditing: boolean;
  editText: string;
  onMenuToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditTextChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export default function PublicationListCard({
  publication,
  isMenuOpen,
  isEditing,
  editText,
  onMenuToggle,
  onEdit,
  onDelete,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
}: PublicationListCardProps) {
  return (
    <div className="bg-riff-header rounded-sm p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-riff-primary-dark to-riff-primary flex-shrink-0 flex items-center justify-center">
            {publication.author?.avatar ? (
              <Image
                src={publication.author.avatar}
                alt={publication.author.name}
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-white text-sm font-semibold">
                {publication.author?.name ? publication.author.name.charAt(0).toUpperCase() : 'U'}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">
              {publication.author?.name || 'Usuario'}
            </h3>
            <p className="text-riff-text-secondary text-xs">{publication.time}</p>
          </div>
        </div>
        <div className="relative menu-container">
          <button
            onClick={onMenuToggle}
            className="text-white/50 hover:text-riff-primary transition-colors"
          >
            <BsThreeDots className="w-5 h-5" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-8 bg-riff-text-primary border border-white/20 rounded-sm shadow-lg z-10 min-w-[140px] overflow-hidden">
              <button
                onClick={onEdit}
                className="w-full px-4 py-2 text-left text-white text-sm hover:bg-riff-primary/20 transition-colors flex items-center gap-2"
              >
                <MdEdit className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={onDelete}
                className="w-full px-4 py-2 text-left text-red-400 text-sm hover:bg-red-500/20 transition-colors flex items-center gap-2"
              >
                <MdDelete className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="mb-3 space-y-2">
          <textarea
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white placeholder-riff-text-secondary text-sm
                     focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                     transition-all duration-200 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              className="px-3 py-1.5 bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white text-xs font-medium rounded-sm hover:from-riff-primary hover:to-riff-primary-dark transition-all duration-200"
            >
              Guardar
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1.5 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-xs font-medium rounded-sm border border-white/20 transition-colors duration-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-white text-sm mb-3">{publication.text || publication.content}</p>
      )}

      {/* Image */}
      {publication.image && (
        <div className="mb-3 overflow-hidden flex items-center justify-center bg-riff-header">
          <img
            src={publication.image}
            alt="Publicación"
            className="w-full h-auto max-h-[400px] object-contain"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 pt-3">
        <div className="flex items-center gap-1.5 text-white/50">
          <AiOutlineHeart className="w-5 h-5" />
          <span className="text-sm">{publication.likes}</span>
        </div>

        <div className="flex items-center gap-1.5 text-white/50">
          <BsBookmark className="w-5 h-5" />
          <span className="text-sm">{publication.saved || 0}</span>
        </div>
      </div>
    </div>
  );
}
