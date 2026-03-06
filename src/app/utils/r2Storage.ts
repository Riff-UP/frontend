import { API_BASE_URL } from '../config/api';

/**
 * Utilidad para subir archivos a Cloudflare R2
 * Usa la API S3-compatible de R2 con CORS habilitado
 */

interface R2Config {
  accountId: string;
  bucket: string;
  publicUrl: string;
}

const R2_CONFIG: R2Config = {
  accountId: '582977cf96cf897306121149b1846ebc', // Del endpoint
  bucket: process.env.NEXT_PUBLIC_R2_BUCKET || 'riffcontentbuck',
  publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-5a853459931144dca4331ca77afeee53.r2.dev',
};

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
 * Convierte un archivo a Base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remover el prefijo "data:image/jpeg;base64,"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Sube un archivo a R2 usando el backend como proxy
 */
export async function uploadToR2(file: File): Promise<string> {
  try {
    console.log('🚀 Iniciando subida a R2...', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Validar archivo
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const filename = generateUniqueFilename(file.name);
    const base64Data = await fileToBase64(file);

    console.log('📦 Archivo preparado:', { filename, size: base64Data.length });

    // Enviar al backend para que lo suba a R2
    const response = await fetch(`${API_BASE_URL}/upload/r2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        filename,
        contentType: file.type,
        base64Data,
      }),
    });

    console.log('📡 Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error del backend:', errorText);
      throw new Error(`Error al subir archivo: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Subida exitosa:', data);

    // El backend debe retornar { url: "https://..." }
    if (!data.url) {
      throw new Error('El backend no retornó una URL válida');
    }

    return data.url;
  } catch (error) {
    console.error('💥 Error en uploadToR2:', error);
    throw error;
  }
}

/**
 * Valida que el archivo sea una imagen válida
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
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
