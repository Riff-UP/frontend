'use client';

import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../config/api';

export function useLogout() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Llamar al endpoint de logout del gateway
      await fetch(`${API_BASE_URL}/auth/logout`, {
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