'use client';

import { useState } from 'react';
import { MdEdit, MdDelete } from 'react-icons/md';
import { FiMapPin, FiCalendar } from 'react-icons/fi';
import Calendar from './common/Calendar';
import EventForm from './events/EventForm';
import EventCard from './events/EventCard';
import DeleteConfirmModal from './common/DeleteConfirmModal';
import { useEvents } from '../hooks/useEvents';
import { useUser } from '../hooks/useUser';
import { Event } from '@/app/types';

export default function Events() {
  const { user, refreshUser } = useUser();
  const { events: backendEvents, loading, createEvent, updateEvent, deleteEvent } = useEvents();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [originalEditDate, setOriginalEditDate] = useState<string>('');
  
  // Form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    location: '',
    date: '',
    time: '',
    description: '',
  });

  const events: Event[] = backendEvents.map(e => {
    const date = e.event_date.split('T')[0];
    const time = e.event_date.includes('T') ? e.event_date.substring(11, 16) : '';
    return {
      id: e._id,
      title: e.title,
      location: e.location,
      date,
      time,
      description: e.description,
    };
  });

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !user) return;

    const today = new Date().toISOString().split('T')[0];
    if (!editingEventId && newEvent.date < today) return;
    if (editingEventId && newEvent.date !== originalEditDate && newEvent.date < today) return;

    setSaving(true);

    const timeStr = newEvent.time || '00:00';
    const eventDateTime = `${newEvent.date}T${timeStr}:00.000Z`;

    if (editingEventId) {
      const success = await updateEvent(editingEventId, {
        title: newEvent.title,
        location: newEvent.location,
        event_date: eventDateTime,
        description: newEvent.description
      });
      if (success && selectedEvent?.id === editingEventId) {
        setSelectedEvent({ 
          id: editingEventId, 
          title: newEvent.title,
          location: newEvent.location,
          date: newEvent.date,
          time: newEvent.time,
          description: newEvent.description,
        });
      }
    } else {
      const result = await createEvent({
        title: newEvent.title,
        location: newEvent.location,
        event_date: eventDateTime,
        description: newEvent.description,
      });

      if (!result) {
        setSaving(false);
        return;
      }
    }

    await refreshUser();

    setSaving(false);
    setNewEvent({ title: '', location: '', date: '', time: '', description: '' });
    setEditingEventId(null);
    setOriginalEditDate('');
    setShowModal(false);
  };

  const handleEditEvent = (event: Event) => {
    setNewEvent({
      title: event.title,
      location: event.location,
      date: event.date,
      time: event.time,
      description: event.description || '',
    });
    setOriginalEditDate(event.date);
    setEditingEventId(event.id);
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setEventToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (eventToDelete && user) {
      await deleteEvent(eventToDelete);
      if (selectedEvent?.id === eventToDelete) {
        setSelectedEvent(null);
      }
      setEventToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const cancelDelete = () => {
    setEventToDelete(null);
    setShowDeleteModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewEvent({ title: '', location: '', date: '', time: '', description: '' });
    setEditingEventId(null);
    setOriginalEditDate('');
  };

  const formatEventDate = (dateString: string, timeString?: string) => {
    const [year, month, day] = dateString.split('-');
    const formattedDate = `${year}-${month}-${day}`;
    if (timeString) {
      return `${formattedDate} • ${timeString}`;
    }
    return formattedDate;
  };

  const hasEventOnDate = (day: number) => {
    return events.some(event => {
      const [year, month, dayOfMonth] = event.date.split('-').map(Number);
      return dayOfMonth === day && 
             (month - 1) === currentMonth && 
             year === currentYear;
    });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl sm:text-2xl font-bold">Eventos</h2>
          <p className="text-white/80 text-xs sm:text-sm mt-1">Gestiona y organiza tus próximos eventos.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white text-sm font-medium rounded-sm hover:from-riff-primary hover:to-riff-primary-dark transition-all duration-200 flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          Crear evento
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-96 space-y-6">
          <Calendar
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onMonthChange={setCurrentMonth}
            onYearChange={setCurrentYear}
            hasEventOnDate={hasEventOnDate}
          />

          {selectedEvent && (
            <div className="bg-riff-header border border-white/10 rounded-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-riff-primary-dark to-riff-primary"></div>
              <div className="p-4">
                <h3 className="text-white text-base font-semibold mb-4">Evento seleccionado</h3>
                <h4 className="text-white font-semibold text-lg mb-4">{selectedEvent.title}</h4>
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <FiMapPin className="w-5 h-5 text-riff-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-sm">{selectedEvent.location || 'Sin ubicación'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiCalendar className="w-5 h-5 text-riff-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-sm">
                        {formatEventDate(selectedEvent.date, selectedEvent.time)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditEvent(selectedEvent)}
                    className="flex-1 px-3 py-2 bg-riff-primary/20 hover:bg-riff-primary/30 text-riff-primary border border-riff-primary/30 rounded-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <MdEdit className="w-4 h-4" />
                    <span className="text-sm">Editar</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(selectedEvent.id)}
                    className="flex-1 px-3 py-2 bg-red-400/20 hover:bg-red-400/30 text-red-400 border border-red-400/30 rounded-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <MdDelete className="w-4 h-4" />
                    <span className="text-sm">Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="rounded-sm p-4 sm:p-0">
            <h3 className="text-white text-base sm:text-lg font-semibold mb-4">Próximos eventos</h3>
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <svg className="animate-spin h-6 w-6 text-riff-primary" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : events.length === 0 ? (
                <p className="text-riff-text-secondary text-sm text-center py-8">No hay eventos próximos</p>
              ) : (
                events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    formatDate={formatEventDate}
                    onClick={setSelectedEvent}
                    isSelected={selectedEvent?.id === event.id}
                    showAttendButton={false}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <EventForm
        isOpen={showModal}
        isEditing={!!editingEventId}
        title={newEvent.title}
        location={newEvent.location}
        date={newEvent.date}
        time={newEvent.time}
        description={newEvent.description}
        saving={saving}
        onTitleChange={(value) => setNewEvent({ ...newEvent, title: value })}
        onLocationChange={(value) => setNewEvent({ ...newEvent, location: value })}
        onDateChange={(value) => setNewEvent({ ...newEvent, date: value })}
        onTimeChange={(value) => setNewEvent({ ...newEvent, time: value })}
        onDescriptionChange={(value) => setNewEvent({ ...newEvent, description: value })}
        onSubmit={handleCreateEvent}
        onClose={handleCloseModal}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title="¿Eliminar evento?"
        message="Esta acción no se puede deshacer. El evento será eliminado permanentemente."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}