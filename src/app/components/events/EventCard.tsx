import { FiMapPin } from 'react-icons/fi';
import { BsCalendarEventFill } from 'react-icons/bs';
import { MdCheck } from 'react-icons/md';
import { LiaUserCheckSolid } from 'react-icons/lia';
import { Event } from '@/app/types';

interface EventCardProps {
  event: Event;
  formatDate: (date: string, time?: string) => string;
  onAttend?: (id: string) => void;
  onClick?: (event: Event) => void;
  showAttendButton?: boolean;
  isSelected?: boolean;
}

export default function EventCard({
  event,
  formatDate,
  onAttend,
  onClick,
  showAttendButton = true,
  isSelected = false,
}: EventCardProps) {
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
          </div>
        </div>
        {showAttendButton && onAttend && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAttend(event.id);
            }}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-sm font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              event.isAttending || event.attending
                ? 'bg-gradient-to-r from-riff-save to-riff-save-2 text-white'
                : 'bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white hover:from-riff-primary hover:to-riff-primary-dark'
            }`}
          >
            {event.isAttending || event.attending ? (
              <>
                <MdCheck className="w-4 h-4" />
                <span>Asistir</span>
              </>
            ) : (
              <>
                <LiaUserCheckSolid className="w-5 h-5" />
                <span>Asistir</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
