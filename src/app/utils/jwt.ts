/**
 * Decodifica un JWT sin verificar la firma
 * Solo para leer datos en el frontend
 * @param token - Token JWT a decodificar
 * @returns El payload del JWT o null si hay error
 */
export function decodeJWT<T = unknown>(token: string): T | null {
  try {
    // Un JWT tiene 3 partes separadas por puntos: header.payload.signature
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    // El payload es la segunda parte (índice 1)
    const payload = parts[1];

    // Decodificar de Base64URL a JSON
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as T;
  } catch {
    return null;
  }
}

/**
 * Verifica si un JWT ha expirado
 * @param token - Token JWT a verificar
 * @returns true si el token ha expirado, false en caso contrario
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWT<{ exp?: number }>(token);

  if (!payload || !payload.exp) {
    return true;
  }

  // exp está en segundos, Date.now() está en milisegundos
  return payload.exp * 1000 < Date.now();
}

/**
 * Obtiene el token del localStorage y lo valida
 * @returns El token si es válido, null si no existe o ha expirado
 */
export function getValidToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('token');

  if (!token) {
    return null;
  }

  if (isJWTExpired(token)) {
    localStorage.removeItem('token');
    return null;
  }

  return token;
}

/**
 * Interfaz típica del payload de un JWT de autenticación
 */
export interface JWTPayload {
  id: string;
  email: string;
  name?: string;
  role?: string;
  iat?: number; // issued at
  exp?: number; // expiration
}

/**
 * Extrae información del usuario del token JWT
 * @param token - Token JWT (opcional, si no se pasa intenta obtenerlo del localStorage)
 * @returns Los datos del usuario o null si no hay token válido
 */
export function getUserFromToken(token?: string): JWTPayload | null {
  const jwtToken = token || getValidToken();

  if (!jwtToken) {
    return null;
  }

  return decodeJWT<JWTPayload>(jwtToken);
}
