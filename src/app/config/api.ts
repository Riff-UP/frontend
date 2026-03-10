/**
 * Configuración centralizada de la URL base de la API.
 * SIEMPRE apunta al gateway público configurado para el frontend.
 */
function normalizeApiBaseUrl(value?: string): string {
  const rawValue = (value || 'https://api.riffmx.lat/api').trim();
  const withoutTrailingSlash = rawValue.replace(/\/+$/, '');

  if (withoutTrailingSlash.endsWith('/api')) {
    return withoutTrailingSlash;
  }

  return `${withoutTrailingSlash}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

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
