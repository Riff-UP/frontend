'use client';

export default function ProfileFromToken() {
  return (
    <div className="bg-riff-header border border-white/10 rounded-sm p-6 flex flex-col items-center justify-center min-h-[200px] gap-3">
      <svg className="w-8 h-8 text-riff-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-riff-text-secondary text-sm text-center">
        No se pudo cargar tu perfil. Intenta recargar la página.
      </p>
    </div>
  );
}

