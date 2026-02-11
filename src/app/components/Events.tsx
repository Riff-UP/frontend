'use client';

import { useState } from 'react';
import { IoMdClose } from 'react-icons/io';
import { MdEdit, MdDelete } from 'react-icons/md';
import { FiMapPin, FiClock, FiCalendar } from 'react-icons/fi';

interface Event {
  id: number;
  title: string;
  location: string;
  date: string;
  time: string;
}

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

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysOfWeek = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust so Monday is 0
  };

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

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Previous month days
    const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="text-center py-2 text-white/30 text-sm">
          {prevMonthDays - i}
        </div>
      );
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
      const hasEvent = hasEventOnDate(day);
      
      days.push(
        <div
          key={day}
          className={`text-center py-2 text-sm cursor-pointer rounded-sm transition-colors relative ${
            isToday
              ? 'bg-riff-primary text-white font-semibold'
              : 'text-white hover:bg-riff-primary/20'
          }`}
        >
          {day}
          {hasEvent && !isToday && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-riff-primary rounded-full"></div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl sm:text-2xl font-bold">Eventos</h2>
          <p className="text-riff-text-secondary text-xs sm:text-sm mt-1">Gestiona y organiza tus próximos eventos.</p>
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
          <div className="bg-riff-header border border-white/10 rounded-sm p-4">
            {/* Month/Year selector */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="text-white hover:text-riff-primary transition-colors p-2"
              >
                ‹
              </button>
              <div className="flex gap-2">
                <select
                  value={months[currentMonth]}
                  onChange={(e) => setCurrentMonth(months.indexOf(e.target.value))}
                  className="px-3 py-1.5 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white text-sm focus:outline-none focus:ring-2 focus:ring-riff-primary"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className="px-3 py-1.5 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white text-sm focus:outline-none focus:ring-2 focus:ring-riff-primary"
                >
                  {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleNextMonth}
                className="text-white hover:text-riff-primary transition-colors p-2"
              >
                ›
              </button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysOfWeek.map((day) => (
                <div key={day} className="text-center text-white/60 text-xs font-medium py-2">
                  {day}
                </div>
              ))}
              {renderCalendar()}
            </div>
          </div>

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
          <div className="bg-riff-header border border-white/10 rounded-sm p-4 sm:p-6">
            <h3 className="text-white text-base sm:text-lg font-semibold mb-4">Próximos eventos</h3>
            <div className="space-y-3">
              {events.length === 0 ? (
                <p className="text-riff-text-secondary text-sm text-center py-8">No hay eventos próximos</p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-4 border rounded-sm cursor-pointer transition-all ${
                      selectedEvent?.id === event.id
                        ? 'border-riff-primary bg-riff-primary/10'
                        : 'border-white/10 hover:border-riff-primary/50 bg-riff-text-primary/30'
                    }`}
                  >
                    <h4 className="text-white font-semibold text-base mb-3">{event.title}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-riff-text-secondary text-sm">
                        <FiMapPin className="w-4 h-4" />
                        <span>{event.location || 'Sin ubicación'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-riff-text-secondary text-sm">
                        <FiCalendar className="w-4 h-4" />
                        <span>{formatEventDate(event.date, event.time)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-riff-card border border-white/20 rounded-lg w-full max-w-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h3 className="text-white text-lg sm:text-xl font-semibold">
                {editingEventId ? 'Editar evento' : 'Subir evento'}
              </h3>
              <button
                onClick={handleCloseModal}
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
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary
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
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white text-sm
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
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary
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
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                             transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 sm:p-6 border-t border-white/10">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2.5 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEvent}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-riff-save to-riff-save-2 hover:from-riff-save-2 hover:to-riff-save text-white text-sm font-medium rounded-sm transition-all duration-200"
                disabled={!newEvent.title || !newEvent.date}
              >
                {editingEventId ? 'Guardar' : 'Subir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-riff-card border border-white/20 rounded-lg w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-400/20 flex items-center justify-center mb-4">
                  <MdDelete className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">¿Eliminar evento?</h3>
                <p className="text-riff-text-secondary text-sm mb-6">
                  Esta acción no se puede deshacer. El evento será eliminado permanentemente.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2.5 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-sm font-medium rounded-sm transition-all duration-200"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
