'use client';

import { useState } from 'react';
import FollowerGrowthChart from './analytics/FollowerGrowthChart';
import InteractionsChart from './analytics/InteractionsChart';
import EventAttendanceChart from './analytics/EventAttendanceChart';
import EventRatingChart from './analytics/EventRatingChart';
import type { FollowerGrowthData, InteractionData, EventAttendanceData, EventRatingData } from '@/app/types';

export default function Analytics() {
  // TODO: Obtener datos de la API
  const followerGrowthData: FollowerGrowthData[] = [];
  const interactionData: InteractionData[] = [];
  const eventAttendanceData: EventAttendanceData[] = [];
  const eventRatingData: EventRatingData[] = [];

  const totalInteractions = interactionData.reduce((sum, week) => sum + week.interactions, 0);
  const totalFollowerGrowth = followerGrowthData.length > 0 
    ? followerGrowthData[followerGrowthData.length - 1].followers - followerGrowthData[0].followers 
    : 0;
  const growthPercentage = followerGrowthData.length > 0 
    ? (totalFollowerGrowth / followerGrowthData[0].followers * 100).toFixed(1)
    : '0.0';

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-white text-xl sm:text-2xl font-bold">Estadísticas del Mes</h2>
        </div>
        <p className="text-white/80 text-xs sm:text-sm">
          Visualiza el rendimiento de tu perfil en las últimas 4 semanas
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-lg p-4 hover:border-riff-primary/30 transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-riff-primary rounded-full group-hover:animate-pulse"></div>
            <p className="text-white/60 text-xs sm:text-sm">Seguidores Totales</p>
          </div>
          <p className="text-white text-xl sm:text-2xl font-bold mb-1">
            {followerGrowthData.length > 0 
              ? followerGrowthData[followerGrowthData.length - 1].followers.toLocaleString()
              : '0'}
          </p>
          <p className="text-green-400 text-xs font-medium">+{growthPercentage}% este mes</p>
        </div>

        <div className="bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-lg p-4 hover:border-riff-secondary/30 transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-riff-secondary rounded-full group-hover:animate-pulse"></div>
            <p className="text-white/60 text-xs sm:text-sm">Interacciones</p>
          </div>
          <p className="text-white text-xl sm:text-2xl font-bold mb-1">
            {totalInteractions.toLocaleString()}
          </p>
          <p className="text-white/60 text-xs">
            {interactionData.length > 0 ? (totalInteractions / interactionData.length).toFixed(0) : '0'} promedio/semana
          </p>
        </div>

        <div className="bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-lg p-4 hover:border-riff-primary-dark/30 transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-riff-primary-dark rounded-full group-hover:animate-pulse"></div>
            <p className="text-white/60 text-xs sm:text-sm">Total Asistentes</p>
          </div>
          <p className="text-white text-xl sm:text-2xl font-bold mb-1">
            {eventAttendanceData.reduce((sum, event) => sum + event.attendees, 0).toLocaleString()}
          </p>
          <p className="text-white/60 text-xs">{eventAttendanceData.length} eventos</p>
        </div>

        <div className="bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-lg p-4 hover:border-riff-registro/30 transition-all duration-300 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-riff-registro rounded-full group-hover:animate-pulse"></div>
            <p className="text-white/60 text-xs sm:text-sm">Valoración Promedio</p>
          </div>
          <p className="text-white text-xl sm:text-2xl font-bold mb-1">
            {eventRatingData.length > 0 
              ? (eventRatingData.reduce((sum, event) => sum + event.averageRating, 0) / eventRatingData.length).toFixed(1)
              : '0.0'} ⭐
          </p>
          <p className="text-white/60 text-xs">
            {eventRatingData.reduce((sum, event) => sum + event.totalRatings, 0)} valoraciones
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follower Growth */}
        <FollowerGrowthChart data={followerGrowthData} />

        {/* Interactions */}
        <InteractionsChart data={interactionData} />

        {/* Event Attendance */}
        <EventAttendanceChart data={eventAttendanceData} />

        {/* Event Ratings */}
        <EventRatingChart data={eventRatingData} />
      </div>
    </div>
  );
}
