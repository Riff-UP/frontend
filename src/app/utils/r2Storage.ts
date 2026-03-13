/**
 * Utilidad para subir archivos a Cloudflare R2
 * Usa la API S3-compatible de R2 con CORS habilitado
 */

const UPLOAD_TIMEOUT_MS = 20_000;

/**
 * Genera un nombre de archivo único
 */
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
}

/**
 * Función auxiliar para fetch con timeout
 */
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = UPLOAD_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La subida del archivo tardó demasiado. Intenta de nuevo.');
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Sube un archivo a R2 usando el backend como proxy (multipart/form-data)
 */
export async function uploadToR2(file: File): Promise<string> {
  // Validar archivo
  const validation = validateMediaFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const filename = generateUniqueFilename(file.name);

  // Preparar FormData (mantener compatibilidad con backend)
  const formData = new FormData();
  // Añadimos el archivo en dos keys comunes para mayor compatibilidad
  formData.append('file', file, filename);
  formData.append('image', file, filename);
  // Incluimos filename por si el backend lo espera
  formData.append('filename', filename);

  // Armar headers: no setear Content-Type para que el browser añada el boundary
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetchWithTimeout('/api/upload/r2', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Error al subir archivo: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // El backend debe retornar { url: "https://..." } o similar
  const url = data?.url || data?.data?.url || data?.result?.url;
  if (!url) {
    throw new Error('El backend no retornó una URL válida');
  }

  return url;
}

/**
 * Valida que el archivo sea una imagen o video válido para publicaciones
 */
export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  const isVideo = file.type.startsWith('video/');
  const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;

  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
    'video/x-m4v',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo no permitido. Solo se permiten imágenes o videos compatibles (JPG, PNG, GIF, WEBP, MP4, MOV, WEBM, AVI, M4V).',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: isVideo
        ? 'El video es muy grande. Tamaño máximo: 100MB'
        : 'La imagen es muy grande. Tamaño máximo: 10MB',
    };
  }

  return { valid: true };
}

/**
 * Valida que el archivo sea una imagen válida (compatibilidad con flujos existentes)
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024;
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, WEBP)',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'El archivo es muy grande. Tamaño máximo: 10MB',
    };
  }

  return { valid: true };
}
