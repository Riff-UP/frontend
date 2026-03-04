'use client';

import { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';

interface EventRatingModalProps {
  isOpen: boolean;
  eventTitle: string;
  eventDate: string;
  onSubmit: (rating: number, comment: string) => void;
  onClose: () => void;
}

export default function EventRatingModal({
  isOpen,
  eventTitle,
  eventDate,
  onSubmit,
  onClose
}: EventRatingModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, '');
      // Reset form
      setRating(0);
    }
  };

  const handleClose = () => {
    setRating(0);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-riff-header border border-white/10 rounded-sm w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-4 sm:p-6 border-b border-white/10">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
          >
            <IoMdClose className="w-6 h-6" />
          </button>
          <h2 className="text-white text-xl sm:text-2xl font-bold mb-2">
            ¿Cómo estuvo el evento?
          </h2>
          
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Event Info */}
          <div className="bg-riff-text-primary/40 rounded-sm p-3 border border-white/5">
            <h3 className="text-white font-semibold text-sm sm:text-base mb-1">
              {eventTitle}
            </h3>
            <p className="text-white/60 text-xs sm:text-sm">{eventDate}</p>
          </div>

          {/* Star Rating */}
          <div>
          
            <div className="flex items-center gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-all duration-200 hover:scale-110"
                >
                  <FaStar
                    className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400'
                        : 'text-white/20'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-white/60 text-sm mt-2">
                {rating === 1 && 'Muy malo'}
                {rating === 2 && 'Malo'}
                {rating === 3 && 'Regular'}
                {rating === 4 && 'Bueno'}
                {rating === 5 && 'Excelente'}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-white/10 flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200"
          >
            Ahora no
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0}
            className={`flex-1 px-4 py-2.5 text-white text-sm font-medium rounded-sm transition-all duration-200 ${
              rating > 0
                ? 'bg-gradient-to-r from-riff-primary-dark to-riff-primary hover:from-riff-primary hover:to-riff-primary-dark'
                : 'bg-riff-text-secondary/20 text-white/40 cursor-not-allowed'
            }`}
          >
            Enviar valoración
          </button>
        </div>
      </div>
    </div>
  );
}
