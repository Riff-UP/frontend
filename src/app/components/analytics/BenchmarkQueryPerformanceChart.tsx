'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface BenchmarkQueryPerformanceChartProps {
  data: Array<{
    name: string;
    calls: number;
    meanTime: number;
  }>;
}

const BAR_COLOR = '#2B78D4';

export default function BenchmarkQueryPerformanceChart({ data }: BenchmarkQueryPerformanceChartProps) {
  return (
    <div className="bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-2xl p-5 shadow-lg shadow-riff-primary-dark/10">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-white text-lg font-bold">Top queries por volumen</h3>
          <p className="text-white/60 text-sm">Comparativa rápida entre cantidad de ejecuciones y latencia promedio.</p>
        </div>
        <span className="text-xs text-riff-primary font-semibold bg-riff-primary/10 border border-riff-primary/20 rounded-full px-3 py-1">
          Top 6
        </span>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.96)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '14px',
                color: '#fff',
              }}
              formatter={(value?: number | string, name?: string) => {
                const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                if (name === 'calls') return [numericValue.toLocaleString(), 'Llamadas'];
                return [`${numericValue.toFixed(2)} ms`, 'Tiempo promedio'];
              }}
            />
            <Bar dataKey="calls" radius={[10, 10, 0, 0]} fill={BAR_COLOR} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
