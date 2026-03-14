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
const DEFAULT_BACKEND_VIDEO_FALLBACK_MAX_MB = 40;
const DEFAULT_CLOUDINARY_CHUNK_SIZE_MB = 20;
const DEFAULT_DIRECT_R2_VIDEO_THRESHOLD_MB = 120;

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

function getBackendVideoFallbackMaxMb(): number {
  const raw = process.env.NEXT_PUBLIC_BACKEND_VIDEO_FALLBACK_MAX_MB;
  if (!raw) return DEFAULT_BACKEND_VIDEO_FALLBACK_MAX_MB;

  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_BACKEND_VIDEO_FALLBACK_MAX_MB;

  return clamp(Math.floor(parsed), 1, ABSOLUTE_VIDEO_MAX_MB);
}

function getCloudinaryChunkSizeMb(): number {
  const raw = process.env.NEXT_PUBLIC_CLOUDINARY_CHUNK_SIZE_MB;
  if (!raw) return DEFAULT_CLOUDINARY_CHUNK_SIZE_MB;

  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_CLOUDINARY_CHUNK_SIZE_MB;

  return clamp(Math.floor(parsed), 5, 100);
}

function getDirectR2VideoThresholdMb(): number {
  const raw = process.env.NEXT_PUBLIC_DIRECT_R2_VIDEO_THRESHOLD_MB;
  if (!raw) return DEFAULT_DIRECT_R2_VIDEO_THRESHOLD_MB;

  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_DIRECT_R2_VIDEO_THRESHOLD_MB;

  return clamp(Math.floor(parsed), 1, ABSOLUTE_VIDEO_MAX_MB);
}

class CloudinaryNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudinaryNetworkError';
  }
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

interface CloudinarySignedUploadPayload {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
}

interface DirectR2SignedUploadPayload {
  uploadUrl: string;
  url: string;
  contentType?: string;
}

function createUploadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function getCloudinarySignedPayload(publicId: string): Promise<CloudinarySignedUploadPayload> {
  const timestamp = Math.floor(Date.now() / 1000);
  const response = await fetchWithTimeout(
    '/api/upload/cloudinary/sign',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paramsToSign: {
          timestamp,
          folder: 'riff-temp',
          public_id: publicId,
        },
      }),
    },
    30_000,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'No se pudo firmar la subida en Cloudinary.');
  }

  const payload = await response.json() as CloudinarySignedUploadPayload;
  if (!payload.signature || !payload.timestamp || !payload.apiKey || !payload.cloudName) {
    throw new Error('La firma de Cloudinary es inválida o incompleta.');
  }

  return payload;
}

async function uploadVideoDirectlyToCloudinary(
  file: File,
  filename: string,
  onProgress?: UploadProgressCallback,
): Promise<{ publicId: string; resourceType: 'video' }> {
  onProgress?.(1, 'Preparando subida...');

  const baseName = filename.replace(/\.[^/.]+$/, '');
  const publicId = `riff-temp/${baseName}`;
  const signedPayload = await getCloudinarySignedPayload(publicId);
  const chunkSizeBytes = getCloudinaryChunkSizeMb() * MB_IN_BYTES;
  const totalBytes = file.size;
  const uploadId = createUploadId();

  let offset = 0;
  let lastChunkResponse: Record<string, unknown> | null = null;

  while (offset < totalBytes) {
    const chunkEnd = Math.min(offset + chunkSizeBytes, totalBytes);
    const chunk = file.slice(offset, chunkEnd);
    const chunkNumber = Math.floor(offset / chunkSizeBytes) + 1;
    const totalChunks = Math.ceil(totalBytes / chunkSizeBytes);

    const formData = new FormData();
    formData.append('file', chunk, filename);
    formData.append('api_key', signedPayload.apiKey);
    formData.append('timestamp', String(signedPayload.timestamp));
    formData.append('signature', signedPayload.signature);
    formData.append('folder', 'riff-temp');
    formData.append('public_id', publicId);

    const response = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${signedPayload.cloudName}/video/upload`);
      xhr.timeout = VIDEO_CLOUDINARY_UPLOAD_TIMEOUT_MS;
      xhr.setRequestHeader('X-Unique-Upload-Id', uploadId);
      xhr.setRequestHeader('Content-Range', `bytes ${offset}-${chunkEnd - 1}/${totalBytes}`);

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

        reject(new Error(responseText || `No se pudo subir el fragmento ${chunkNumber}/${totalChunks} a Cloudinary (${xhr.status}).`));
      };

      xhr.onerror = () => {
        reject(new CloudinaryNetworkError('No se pudo conectar con Cloudinary. Revisa tu internet, VPN, adblock o firewall e inténtalo de nuevo.'));
      };

      xhr.ontimeout = () => {
        const seconds = Math.ceil(VIDEO_CLOUDINARY_UPLOAD_TIMEOUT_MS / 1000);
        reject(new CloudinaryNetworkError(`La conexión con Cloudinary tardó demasiado (${seconds}s). Reintenta y verifica tu red.`));
      };

      xhr.send(formData);
    });

    lastChunkResponse = response;
    offset = chunkEnd;

    const progress = Math.min(90, Math.max(1, Math.round((offset / totalBytes) * 90)));
    onProgress?.(progress, `Subiendo fragmentos ${chunkNumber}/${totalChunks}...`);
  }

  const responsePublicId = lastChunkResponse?.public_id as string | undefined;
  const finalPublicId = responsePublicId || publicId;
  if (!finalPublicId) {
    throw new Error('Cloudinary no devolvió public_id para el video.');
  }

  return { publicId: finalPublicId, resourceType: 'video' };
}

async function uploadVideoDirectlyToR2(
  file: File,
  filename: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  onProgress?.(1, 'Solicitando URL segura de R2...');

  const signedResponse = await fetchWithTimeout(
    '/api/upload/r2',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directUpload: true,
        filename,
        contentType: file.type || 'application/octet-stream',
      }),
    },
    30_000,
  );

  if (!signedResponse.ok) {
    const errorText = await signedResponse.text();
    throw new Error(errorText || 'No se pudo obtener URL firmada para subir a R2.');
  }

  const signedPayload = await signedResponse.json() as DirectR2SignedUploadPayload;
  if (!signedPayload.uploadUrl || !signedPayload.url) {
    throw new Error('R2 no devolvió datos válidos para la subida directa.');
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedPayload.uploadUrl);
    xhr.timeout = VIDEO_R2_PROCESSING_TIMEOUT_MS;

    const contentType = signedPayload.contentType || file.type || 'application/octet-stream';
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const ratio = event.loaded / event.total;
      const progress = Math.min(98, Math.max(2, Math.round(ratio * 98)));
      onProgress?.(progress, 'Subiendo video directo a R2...');
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`R2 rechazó la subida directa (${xhr.status}).`));
    };

    xhr.onerror = () => {
      reject(new Error('No se pudo completar la subida directa a R2. Revisa tu red e inténtalo de nuevo.'));
    };

    xhr.ontimeout = () => {
      const seconds = Math.ceil(VIDEO_R2_PROCESSING_TIMEOUT_MS / 1000);
      reject(new Error(`La subida directa a R2 tardó demasiado (${seconds}s).`));
    };

    xhr.send(file);
  });

  onProgress?.(100, 'Subida completada');
  return signedPayload.url;
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
    const directR2ThresholdMb = getDirectR2VideoThresholdMb();
    const directR2ThresholdBytes = directR2ThresholdMb * MB_IN_BYTES;

    if (file.size > directR2ThresholdBytes) {
      return uploadVideoDirectlyToR2(file, filename, onProgress);
    }

    let cloudinaryAsset: { publicId: string; resourceType: 'video' } | null = null;
    const backendFallbackMaxMb = getBackendVideoFallbackMaxMb();
    const backendFallbackMaxBytes = backendFallbackMaxMb * MB_IN_BYTES;

    try {
      cloudinaryAsset = await uploadVideoDirectlyToCloudinary(file, filename, onProgress);
    } catch (error) {
      const isNetworkError = error instanceof CloudinaryNetworkError;

      // Reintento único para cortes transitorios en navegador.
      if (isNetworkError) {
        onProgress?.(5, 'Reintentando conexión con Cloudinary...');
        try {
          cloudinaryAsset = await uploadVideoDirectlyToCloudinary(file, filename, onProgress);
        } catch (retryError) {
          if (!(retryError instanceof CloudinaryNetworkError)) {
            throw retryError;
          }
        }
      } else {
        // Errores de configuración/preset/tamaño de Cloudinary no deben disfrazarse como fallback.
        throw error;
      }

      if (!cloudinaryAsset) {
        if (file.size > backendFallbackMaxBytes) {
          throw new Error(
            `No se pudo conectar con Cloudinary desde el navegador y este hosting no permite fallback por servidor para videos grandes (>${backendFallbackMaxMb}MB). Reintenta sin VPN/adblock o usa una red diferente.`
          );
        }

        // Fallback solo para archivos que el serverless puede aceptar.
        onProgress?.(8, 'Conexión directa no disponible, intentando vía servidor...');

        const fallbackFormData = new FormData();
        fallbackFormData.append('file', file, filename);
        fallbackFormData.append('image', file, filename);
        fallbackFormData.append('filename', filename);

        const fallbackHeaders: Record<string, string> = {};
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) fallbackHeaders['Authorization'] = `Bearer ${token}`;
        }

        const fallbackResponse = await fetchWithTimeout(
          '/api/upload/r2',
          {
            method: 'POST',
            headers: fallbackHeaders,
            body: fallbackFormData,
          },
          VIDEO_R2_PROCESSING_TIMEOUT_MS,
        );

        if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          if (fallbackResponse.status === 413 || /payload too large|function_payload_too_large/i.test(errorText)) {
            throw new Error(
              `El servidor rechazó el video por tamaño al usar fallback. Límite práctico actual del servidor: ~${backendFallbackMaxMb}MB.`
            );
          }
          throw new Error(errorText || `Error al subir video vía servidor: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
        }

        const fallbackData = await fallbackResponse.json();
        const fallbackUrl = fallbackData?.url || fallbackData?.data?.url || fallbackData?.result?.url;
        if (!fallbackUrl) {
          throw new Error('El backend no retornó una URL válida del video en R2 (fallback).');
        }

        onProgress?.(100, 'Subida completada');
        return fallbackUrl;
      }
    }

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
