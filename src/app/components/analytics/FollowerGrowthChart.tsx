'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FollowerGrowthData } from '@/app/types';

interface FollowerGrowthChartProps {
  data: FollowerGrowthData[];
}

export default function FollowerGrowthChart({ data }: FollowerGrowthChartProps) {
  return (
    <div className="bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-lg p-4 sm:p-6 
    shadow-xs shadow-riff-registro/40 hover:shadow-2xl transition-shadow duration-300">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-white text-base sm:text-lg font-bold">
          Crecimiento de Seguidores
        </h3>
      </div>
      <div className="w-full h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#007BFF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#007BFF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
            <XAxis 
              dataKey="week" 
              stroke="#666"
              tick={{ fill: '#999', fontSize: 12 }}
              tickLine={{ stroke: '#666' }}
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
            <Line
              type="monotone"
              dataKey="followers"
              stroke="#007BFF"
              strokeWidth={3}
              dot={{ fill: '#007BFF', r: 5, strokeWidth: 2, stroke: '#1a1a1a' }}
              activeDot={{ r: 7, fill: '#007BFF', stroke: '#fff', strokeWidth: 2 }}
              fill="url(#colorFollowers)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
