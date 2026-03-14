'use client';

import { useState } from 'react';
import { FiMapPin } from 'react-icons/fi';
import { BsCalendarEventFill } from 'react-icons/bs';
import { MdEdit, MdDelete } from 'react-icons/md';
import { MdCheck } from 'react-icons/md';
import { LiaUserCheckSolid } from 'react-icons/lia';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { Event } from '@/app/types';

interface EventCardProps {
  event: Event;
  formatDate: (date: string, time?: string) => string;
  onAttend?: (id: string) => void;
  onClick?: (event: Event) => void;
  onEdit?: (event: Event) => void;
  onDelete?: (id: string) => void;
  showAttendButton?: boolean;
  showEventActions?: boolean;
  isSelected?: boolean;
  // Reviews
  avgRating?: number;
  totalReviews?: number;
  hasReviewed?: boolean;
  onSubmitReview?: (eventId: string, rating: number) => Promise<boolean>;
  onUpdateReview?: (eventId: string, rating: number) => Promise<boolean>;
  onRemoveReview?: (eventId: string) => Promise<boolean>;
  showReviewSection?: boolean;
}

function StarRating({
  value,
  interactive = false,
  hovered,
  onHover,
  onClick,
}: {
  value: number;
  interactive?: boolean;
  hovered?: number;
  onHover?: (n: number) => void;
  onClick?: (n: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => {
        const filled = hovered !== undefined ? n <= hovered : n <= Math.round(value);
        return interactive ? (
          <button
            key={n}
            onMouseEnter={() => onHover?.(n)}
            onMouseLeave={() => onHover?.(0)}
            onClick={() => onClick?.(n)}
            className="text-yellow-400 hover:scale-110 transition-transform"
          >
            {filled ? <FaStar className="w-5 h-5" /> : <FaRegStar className="w-5 h-5" />}
          </button>
        ) : (
          <span key={n} className="text-yellow-400">
            {filled ? <FaStar className="w-3.5 h-3.5" /> : <FaRegStar className="w-3.5 h-3.5" />}
          </span>
        );
      })}
    </div>
  );
}

export default function EventCard({
  event,
  formatDate,
  onAttend,
  onClick,
  onEdit,
  onDelete,
  showAttendButton = true,
  showEventActions = false,
  isSelected = false,
  avgRating = 0,
  totalReviews = 0,
  hasReviewed = false,
  onSubmitReview,
  onUpdateReview,
  onRemoveReview,
  showReviewSection = false,
}: EventCardProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [hovered, setHovered] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleStarClick = async (rating: number) => {
    if (!onSubmitReview || submitting) return;
    setSubmitting(true);
    const ok = await onSubmitReview(event.id, rating);
    if (ok) setReviewOpen(false);
    setSubmitting(false);
  };

  const handleEditReview = () => {
    setEditingReview(true);
    setHovered(0);
  };

  const handleStarUpdate = async (rating: number) => {
    if (!onUpdateReview || submitting) return;
    setSubmitting(true);
    const ok = await onUpdateReview(event.id, rating);
    if (ok) setEditingReview(false);
    setSubmitting(false);
  };

  const handleRemove = async () => {
    if (!onRemoveReview || submitting) return;
    setSubmitting(true);
    await onRemoveReview(event.id);
    setSubmitting(false);
  };

  return (
    <div
      onClick={() => onClick?.(event)}
      className={`bg-riff-header rounded-sm p-4 ${
        onClick
          ? `border cursor-pointer transition-all ${
              isSelected
                ? 'border-riff-primary bg-riff-primary/10'
                : 'border-white/10 hover:border-riff-primary/50 bg-riff-text-primary/30'
            }`
          : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <h3 className="text-white font-semibold text-base mb-3">{event.title}</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/80">
              <FiMapPin className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{event.location || 'Sin ubicación'}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <BsCalendarEventFill className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{formatDate(event.date, event.time)}</span>
            </div>
            {event.description && (
              <p className="text-white/60 text-sm mt-1">{event.description}</p>
            )}

            {/* Rating promedio */}
            {totalReviews > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <StarRating value={avgRating} />
                <span className="text-white/50 text-xs">
                  {avgRating.toFixed(1)} ({totalReviews} {totalReviews === 1 ? 'reseña' : 'reseñas'})
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto items-stretch sm:items-end">
          {showEventActions && (onEdit || onDelete) && (
            <div className="flex gap-2 w-full sm:w-auto" onClick={e => e.stopPropagation()}>
              {onEdit && (
                <button
                  onClick={() => onEdit(event)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-sm text-xs text-riff-primary hover:text-riff-primary/90 transition-colors border border-riff-primary/30 hover:border-riff-primary/50 flex items-center justify-center gap-1.5"
                >
                  <MdEdit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(event.id)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-sm text-xs text-red-400 hover:text-red-300 transition-colors border border-red-400/30 hover:border-red-400/50 flex items-center justify-center gap-1.5"
                >
                  <MdDelete className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              )}
            </div>
          )}

          {/* Botón asistir */}
          {showAttendButton && onAttend && (
            <button
              onClick={e => { e.stopPropagation(); onAttend(event.id); }}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-sm font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                event.isAttending || event.attending
                  ? 'bg-gradient-to-r from-riff-save to-riff-save-2 text-white'
                  : 'bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white hover:from-riff-primary hover:to-riff-primary-dark'
              }`}
            >
              {event.isAttending || event.attending ? (
                <><MdCheck className="w-4 h-4" /><span>Asistiendo</span></>
              ) : (
                <><LiaUserCheckSolid className="w-5 h-5" /><span>Asistir</span></>
              )}
            </button>
          )}

          {/* Botón calificar — solo si asistió y la sección está habilitada */}
          {showReviewSection && (event.isAttending || event.attending) && (
            <div onClick={e => e.stopPropagation()}>
              {hasReviewed ? (
                editingReview ? (
                  <div className="flex flex-col items-center gap-2 bg-riff-card border border-riff-border rounded-sm px-4 py-3">
                    <span className="text-white/70 text-xs">Nueva calificación</span>
                    <StarRating
                      value={0}
                      interactive
                      hovered={hovered}
                      onHover={setHovered}
                      onClick={handleStarUpdate}
                    />
                    <button
                      onClick={() => setEditingReview(false)}
                      className="text-white/30 text-xs hover:text-white/60 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditReview}
                      disabled={submitting}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-sm text-xs text-white/60 hover:text-white transition-colors border border-white/10 hover:border-white/30 disabled:opacity-50"
                    >
                      Editar reseña
                    </button>
                    <button
                      onClick={handleRemove}
                      disabled={submitting}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-sm text-xs text-white/50 hover:text-riff-delete transition-colors border border-white/10 hover:border-riff-delete/40 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                )
              ) : reviewOpen ? (
                <div className="flex flex-col items-center gap-2 bg-riff-card border border-riff-border rounded-sm px-4 py-3">
                  <span className="text-white/70 text-xs">Selecciona tu calificación</span>
                  <StarRating
                    value={0}
                    interactive
                    hovered={hovered}
                    onHover={setHovered}
                    onClick={handleStarClick}
                  />
                  <button
                    onClick={() => setReviewOpen(false)}
                    className="text-white/30 text-xs hover:text-white/60 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setReviewOpen(true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-sm text-xs text-white/60 hover:text-white transition-colors border border-white/10 hover:border-white/30 flex items-center justify-center gap-1.5"
                >
                  <FaRegStar className="w-3.5 h-3.5" />
                  <span>Calificar evento</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}