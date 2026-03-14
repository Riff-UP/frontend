/**
 * Utilidad para subir archivos a Cloudflare R2
 * Usa la API S3-compatible de R2 con CORS habilitado
 */

const IMAGE_UPLOAD_TIMEOUT_MS = 120_000;
const VIDEO_CLOUDINARY_UPLOAD_TIMEOUT_MS = 1_800_000;
const VIDEO_R2_PROCESSING_TIMEOUT_MS = 1_800_000;

const MB_IN_BYTES = 1024 * 1024;
const FREE_TIER_VIDEO_MAX_MB = 100;
const ABSOLUTE_VIDEO_MAX_MB = 1024;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getMaxVideoUploadMb(): number {
  // Si está en true, fuerza el límite gratis típico (100MB).
  const freeTierOnly = process.env.NEXT_PUBLIC_CLOUDINARY_FREE_TIER_ONLY === 'true';
  if (freeTierOnly) return FREE_TIER_VIDEO_MAX_MB;

  // Permite configurar el límite hasta 1GB. Si no existe, usar 1GB por defecto.
  const raw = process.env.NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB;
  if (!raw) return ABSOLUTE_VIDEO_MAX_MB;

  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0) return ABSOLUTE_VIDEO_MAX_MB;

  return clamp(Math.floor(parsed), 1, ABSOLUTE_VIDEO_MAX_MB);
}

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
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = IMAGE_UPLOAD_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const seconds = Math.ceil(timeoutMs / 1000);
      throw new Error(`La subida del archivo tardó demasiado (${seconds}s). Intenta con un archivo más liviano o reintenta.`);
    }

    if (error instanceof TypeError) {
      throw new Error('No se pudo conectar con el servicio de subida. Revisa tu internet e inténtalo de nuevo.');
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

type UploadProgressCallback = (progressPercent: number, stage: string) => void;

async function uploadVideoDirectlyToCloudinary(
  file: File,
  filename: string,
  onProgress?: UploadProgressCallback,
): Promise<{ publicId: string; resourceType: 'video' }> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Faltan variables NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME o NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET para subida de video.');
  }

  const formData = new FormData();
  formData.append('file', file, filename);
  formData.append('upload_preset', uploadPreset);
  formData.append('resource_type', 'video');
  formData.append('folder', 'riff-temp');

  onProgress?.(1, 'Preparando subida...');

  const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
    xhr.timeout = VIDEO_CLOUDINARY_UPLOAD_TIMEOUT_MS;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const ratio = event.loaded / event.total;
      const progress = Math.min(90, Math.max(1, Math.round(ratio * 90)));
      onProgress?.(progress, 'Subiendo video...');
    };

    xhr.onload = () => {
      const responseText = xhr.responseText || '';
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(responseText) as Record<string, unknown>);
        } catch {
          reject(new Error('Cloudinary devolvió una respuesta inválida.'));
        }
        return;
      }

      if (/file size too large|too large|max/i.test(responseText)) {
        reject(new Error('Cloudinary rechazó el video por tamaño. Si usas plan/límite gratis, activa NEXT_PUBLIC_CLOUDINARY_FREE_TIER_ONLY=true (100MB) o revisa el límite de tu preset/plan.'));
        return;
      }

      reject(new Error(responseText || `No se pudo subir el video a Cloudinary (${xhr.status}).`));
    };

    xhr.onerror = () => {
      reject(new Error('No se pudo conectar con Cloudinary. Revisa tu internet e inténtalo de nuevo.'));
    };

    xhr.ontimeout = () => {
      const seconds = Math.ceil(VIDEO_CLOUDINARY_UPLOAD_TIMEOUT_MS / 1000);
      reject(new Error(`La subida del video tardó demasiado (${seconds}s). Intenta con un archivo más liviano o reintenta.`));
    };

    xhr.send(formData);
  });

  const publicId = data?.public_id as string | undefined;
  if (!publicId) {
    throw new Error('Cloudinary no devolvió public_id para el video.');
  }

  return { publicId, resourceType: 'video' };
}

/**
 * Sube un archivo a R2 usando el backend como proxy (multipart/form-data)
 */
export async function uploadToR2(
  file: File,
  options?: { onProgress?: UploadProgressCallback },
): Promise<string> {
  // Validar archivo
  const validation = validateMediaFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const filename = generateUniqueFilename(file.name);

  if (file.type.startsWith('video/')) {
    const onProgress = options?.onProgress;
    const cloudinaryAsset = await uploadVideoDirectlyToCloudinary(file, filename, onProgress);

    const jsonHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) jsonHeaders['Authorization'] = `Bearer ${token}`;
    }

    onProgress?.(94, 'Procesando video...');

    const response = await fetchWithTimeout(
      '/api/upload/r2',
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          cloudinaryPublicId: cloudinaryAsset.publicId,
          resourceType: cloudinaryAsset.resourceType,
          filename,
        }),
      },
      VIDEO_R2_PROCESSING_TIMEOUT_MS,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Error al transformar y subir video: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const url = data?.url || data?.data?.url || data?.result?.url;
    if (!url) {
      throw new Error('El backend no retornó una URL válida del video en R2');
    }

    onProgress?.(100, 'Subida completada');

    return url;
  }

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

  const response = await fetchWithTimeout(
    '/api/upload/r2',
    {
      method: 'POST',
      headers,
      body: formData,
    },
    IMAGE_UPLOAD_TIMEOUT_MS,
  );

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
  const maxVideoUploadMb = getMaxVideoUploadMb();
  const maxSize = isVideo ? maxVideoUploadMb * MB_IN_BYTES : 10 * MB_IN_BYTES;

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
        ? `El video es muy grande. Tamaño máximo: ${maxVideoUploadMb}MB`
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
