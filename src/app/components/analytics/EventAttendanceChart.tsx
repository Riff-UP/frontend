'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { EventAttendanceData } from '@/app/types';
import SafeResponsiveChart from './SafeResponsiveChart';

interface EventAttendanceChartProps {
  data: EventAttendanceData[];
}

export default function EventAttendanceChart({ data }: EventAttendanceChartProps) {
  return (
    <div className="min-w-0 bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-lg p-4 sm:p-6
     shadow-xs shadow-riff-registro/40 hover:shadow-2xl transition-shadow duration-300">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-white text-base sm:text-lg font-bold">
          Asistencia por Evento
        </h3>
      </div>
      <SafeResponsiveChart>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorAttendees" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#002266" />
              <stop offset="100%" stopColor="#007BFF" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
          <XAxis
            dataKey="eventName"
            stroke="#666"
            tick={{ fill: '#999', fontSize: 11 }}
            tickLine={{ stroke: '#666' }}
            angle={-15}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#666"
            tick={{ fill: '#999', fontSize: 12 }}
            tickLine={{ stroke: '#666' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(26, 26, 26, 0.95)',
              border: '1px solid rgba(0, 123, 255, 0.3)',
              borderRadius: '8px',
              color: '#fff',
              backdropFilter: 'blur(10px)'
            }}
            labelStyle={{ color: '#007BFF', fontWeight: 'bold' }}
          />
          <Bar
            dataKey="attendees"
            fill="url(#colorAttendees)"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </SafeResponsiveChart>
    </div>
  );
}
