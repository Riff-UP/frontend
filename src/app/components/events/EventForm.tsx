import { IoMdClose } from 'react-icons/io';
import { FiMapPin, FiClock, FiCalendar } from 'react-icons/fi';

interface EventFormProps {
  isOpen: boolean;
  isEditing: boolean;
  title: string;
  location: string;
  date: string;
  time: string;
  onTitleChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function EventForm({
  isOpen,
  isEditing,
  title,
  location,
  date,
  time,
  onTitleChange,
  onLocationChange,
  onDateChange,
  onTimeChange,
  onSubmit,
  onClose,
}: EventFormProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-riff-header border border-white/20 rounded-lg w-full max-w-2xl shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <h3 className="text-white text-lg sm:text-xl font-semibold">
            {isEditing ? 'Editar evento' : 'Subir evento'}
          </h3>
          <button
            onClick={onClose}
            className="text-riff-primary hover:text-riff-primary/80 transition-colors"
          >
            <IoMdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-white text-sm mb-2">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full px-3 py-2 bg-riff-text-primary border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary
                       focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                       transition-all duration-200"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-white text-sm mb-2">Fecha</label>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
              <input
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-riff-text-primary border border-white/10 rounded-sm text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                         transition-all duration-200"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-white text-sm mb-2">Lugar</label>
            <div className="relative">
              <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
              <input
                type="text"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-riff-text-primary border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary
                         focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                         transition-all duration-200"
              />
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-white text-sm mb-2">Hora</label>
            <div className="relative">
              <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
              <input
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-riff-text-primary border border-white/10 rounded-sm text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                         transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-4 sm:p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-riff-save to-riff-save-2 hover:from-riff-save-2 hover:to-riff-save text-white text-sm font-medium rounded-sm transition-all duration-200"
            disabled={!title || !date}
          >
            {isEditing ? 'Guardar' : 'Subir'}
          </button>
        </div>
      </div>
    </div>
  );
}
