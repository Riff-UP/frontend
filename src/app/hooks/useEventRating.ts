'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL, getAuthHeaders } from '@/app/config/api'; // Ajusta la ruta si es diferente

interface EventToRate {
  id: string; // Cambiado a string porque usamos UUIDs o Mongo IDs
  title: string;
  date: string;
}

export function useEventRating() {
  const [eventToRate, setEventToRate] = useState<EventToRate | null>(null);

  useEffect(() => {
    const fetchPendingReviews = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/events/reviews/pending`, {
          headers: getAuthHeaders(true), // true para que envíe el token
        });
        
        if (!response.ok) return;

        const pendingEvents = await response.json();

        // Si el backend nos devuelve eventos pendientes, tomamos el primero para el pop-up
        if (pendingEvents && pendingEvents.length > 0) {
          const firstEvent = pendingEvents[0];
          
          // Formateamos la fecha (asumiendo que viene como YYYY-MM-DD o ISO)
          const eventDateStr = firstEvent.event_date || firstEvent.date;
          const [year, month, day] = eventDateStr.split('T')[0].split('-');

          setEventToRate({
            id: firstEvent._id || firstEvent.id, // Maneja tanto Mongo _id como UUID normal
            title: firstEvent.title,
            date: `${day}/${month}/${year}`,
          });
        }
      } catch (error) {
        console.error('Error fetching pending reviews:', error);
      }
    };

    // Solo buscamos si el usuario está logueado (tiene token)
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      fetchPendingReviews();
    }
  }, []);

  const handleRatingSubmit = async (eventId: string, rating: number, comment?: string) => {
    try {
      // Aquí enviamos la calificación real al backend!
      const response = await fetch(`${API_BASE_URL}/events/reviews`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          event_id: eventId,
          rating: rating,
          // Si tu backend soporta el campo 'comment', descomenta la siguiente línea:
          // comment: comment 
        }),
      });

      if (response.ok) {
        // Cerramos el modal si todo salió bien
        setEventToRate(null);
      } else {
        console.error('Error al enviar la reseña');
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  const handleRatingClose = () => {
    setEventToRate(null);
  };

  return {
    eventToRate,
    handleRatingSubmit,
    handleRatingClose,
  };
}