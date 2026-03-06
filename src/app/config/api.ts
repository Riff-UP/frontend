/**
 * Configuración centralizada de la URL base de la API.
 * SIEMPRE apunta al gateway público configurado para el frontend.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.riffmx.lat/api';

/**
 * Helper para obtener los headers de autenticación JWT.
 * Retorna el header Authorization sólo si hay token disponible.
 */
export function getAuthHeaders(includeContentType = true): Record<string, string> {
  const headers: Record<string, string> = {};

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}
