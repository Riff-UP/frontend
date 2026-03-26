import type { Metadata } from 'next';
import HypothesisLinkOnlyView from '@/app/components/analytics/HypothesisLinkOnlyView';

export const metadata: Metadata = {
  title: 'Riff | Hipotesis Impacto Local',
  description: 'Vista privada por enlace para evaluar marco teorico, problematica y prueba de hipotesis con datos del backend.',
};

export default function HypothesisImpactLabPage() {
  return <HypothesisLinkOnlyView />;
}
