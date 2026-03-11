'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SafeResponsiveChart from './SafeResponsiveChart';

interface BenchmarkSnapshotTrendChartProps {
  data: Array<{
    date: string;
    enviados: number;
    pendientes: number;
  }>;
}

export default function BenchmarkSnapshotTrendChart({ data }: BenchmarkSnapshotTrendChartProps) {
  return (
    <div className="min-w-0 bg-gradient-to-br from-riff-card to-riff-header border border-white/10 rounded-2xl p-5 shadow-lg shadow-riff-registro/10">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-white text-lg font-bold">Estado de snapshots</h3>
          <p className="text-white/60 text-sm">Seguimiento visual de envíos pendientes y sincronizados con BigQuery.</p>
        </div>
        <span className="text-xs text-riff-registro font-semibold bg-riff-registro/10 border border-riff-registro/20 rounded-full px-3 py-1">
          Historial local
        </span>
      </div>

      <SafeResponsiveChart className="w-full h-80">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="snapshotSentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#28803C" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#28803C" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="snapshotPendingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1D489E" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#1D489E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
          <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              border: '1px solid rgba(96, 165, 250, 0.2)',
              borderRadius: '14px',
              color: '#fff',
            }}
          />
          <Area type="monotone" dataKey="enviados" stroke="#28803C" fill="url(#snapshotSentGradient)" strokeWidth={3} />
          <Area type="monotone" dataKey="pendientes" stroke="#1D489E" fill="url(#snapshotPendingGradient)" strokeWidth={3} />
        </AreaChart>
      </SafeResponsiveChart>
    </div>
  );
}
