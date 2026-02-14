'use client';

import { useState } from 'react';
import { MdEdit, MdDelete } from 'react-icons/md';
import { FiMapPin, FiCalendar } from 'react-icons/fi';
import Calendar from './common/Calendar';
import { Event } from '@/app/types';
import EventForm from './events/EventForm';
import EventCard from './events/EventCard';
import DeleteConfirmModal from './common/DeleteConfirmModal';

export default function Events() {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  
  // Form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    location: '',
    date: '',
    time: '',
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

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.date) return;

    if (editingEventId) {
      // Update existing event
      setEvents(events.map(e => 
        e.id === editingEventId 
          ? { ...e, ...newEvent }
          : e
      ));
      if (selectedEvent?.id === editingEventId) {
        setSelectedEvent({ id: editingEventId, ...newEvent });
      }
    } else {
      // Create new event
      const event: Event = {
        id: Date.now(),
        title: newEvent.title,
        location: newEvent.location,
        date: newEvent.date,
        time: newEvent.time,
      };
      setEvents([...events, event]);
    }

    setNewEvent({ title: '', location: '', date: '', time: '' });
    setEditingEventId(null);
    setShowModal(false);
  };

  const handleEditEvent = (event: Event) => {
    setNewEvent({
      title: event.title,
      location: event.location,
      date: event.date,
      time: event.time,
    });
    setEditingEventId(event.id);
    setShowModal(true);
  };

  const handleDeleteClick = (id: number) => {
    setEventToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      setEvents(events.filter(e => e.id !== eventToDelete));
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
    setNewEvent({ title: '', location: '', date: '', time: '' });
    setEditingEventId(null);
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
      // Parse date in local timezone to avoid off-by-one errors
      const [year, month, dayOfMonth] = event.date.split('-').map(Number);
      return dayOfMonth === day && 
             (month - 1) === currentMonth && 
             year === currentYear;
    });
  };

  return (
    <div className="w-full">
      {/* Header */}
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
        {/* Left Column: Calendar and Selected Event */}
        <div className="w-full lg:w-96 space-y-6">
          {/* Calendar */}
          <Calendar
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onMonthChange={setCurrentMonth}
            onYearChange={setCurrentYear}
            hasEventOnDate={hasEventOnDate}
          />

          {/* Selected Event Details */}
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

        {/* Right Column: Upcoming Events List */}
        <div className="flex-1">
          <div className="rounded-sm p-4 sm:p-0">
            <h3 className="text-white text-base sm:text-lg font-semibold mb-4">Próximos eventos</h3>
            <div className="space-y-3">
              {events.length === 0 ? (
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

      {/* Create Event Modal */}
      <EventForm
        isOpen={showModal}
        isEditing={!!editingEventId}
        title={newEvent.title}
        location={newEvent.location}
        date={newEvent.date}
        time={newEvent.time}
        onTitleChange={(value) => setNewEvent({ ...newEvent, title: value })}
        onLocationChange={(value) => setNewEvent({ ...newEvent, location: value })}
        onDateChange={(value) => setNewEvent({ ...newEvent, date: value })}
        onTimeChange={(value) => setNewEvent({ ...newEvent, time: value })}
        onSubmit={handleCreateEvent}
        onClose={handleCloseModal}
      />

      {/* Delete Confirmation Modal */}
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
