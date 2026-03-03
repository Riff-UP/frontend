'use client';

import { useRouter } from 'next/navigation';

export function useLogout() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Llamar al endpoint de logout del gateway
      await fetch('http://localhost:4000/api/auth/logout', {
        method: 'GET',
        credentials: 'include',
      });
    } catch {
      // Ignorar errores del servidor
    } finally {
      // Siempre limpiar el token local y redirigir
      localStorage.removeItem('token');
      // Disparar evento para actualizar Header
      window.dispatchEvent(new Event('authChange'));
      // Usar replace para que no pueda volver atrás con el navegador
      router.replace('/login');
    }
  };

  return { handleLogout };
}