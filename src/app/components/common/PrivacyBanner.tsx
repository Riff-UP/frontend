"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PrivacyBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Al montar el componente, verificamos si ya aceptaron la política
    const hasAccepted = localStorage.getItem('privacyAccepted');
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    // Guardamos en localStorage y ocultamos el banner
    localStorage.setItem('privacyAccepted', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-riff-header border-t border-riff-primary/30 p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-white/80 text-sm sm:text-base text-center sm:text-left flex-1">
          Riff utiliza cookies y recopila datos básicos para mejorar tu experiencia musical. Al continuar navegando, aceptas nuestra{' '}
          <Link href="/privacy" className="text-riff-primary hover:text-riff-primary-dark font-medium underline underline-offset-2 transition-colors">
            Política de Privacidad
          </Link>.
        </p>
        <button
          onClick={handleAccept}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white rounded-sm font-medium text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}