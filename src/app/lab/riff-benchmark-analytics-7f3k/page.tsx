import type { Metadata } from 'next';
import BenchmarkDashboard from '@/app/components/analytics/BenchmarkDashboard';

export const metadata: Metadata = {
  title: 'Riff | Benchmark Analytics Lab',
  description: 'Vista privada para operar analytics, snapshots y exportaciones de benchmarking.',
};

export default function BenchmarkAnalyticsLabPage() {
  return <BenchmarkDashboard />;
}

