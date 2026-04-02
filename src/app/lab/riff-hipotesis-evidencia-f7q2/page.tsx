import type { Metadata } from 'next';
import HypothesisEvidenceExportView from '@/app/components/analytics/HypothesisEvidenceExportView';

export const metadata: Metadata = {
  title: 'Riff | Evidencia Hipotesis',
  description: 'Vista privada para exportar graficas y resultados de hipotesis en alta calidad.',
};

export default function HypothesisEvidenceExportPage() {
  return <HypothesisEvidenceExportView />;
}
