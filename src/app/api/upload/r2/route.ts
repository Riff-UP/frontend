import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';

export const runtime = 'nodejs';

function getEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  throw new Error(`Falta variable de entorno: ${names.join(' o ')}`);
}

function getR2Config() {
  const endpoint = getEnv('R2_ENDPOINT', 'NEXT_PUBLIC_R2_ENDPOINT');
  const accessKeyId = getEnv('R2_ACCESS_KEY_ID', 'NEXT_PUBLIC_R2_ACCESS_KEY');
  const secretAccessKey = getEnv('R2_SECRET_ACCESS_KEY', 'NEXT_PUBLIC_R2_SECRET_KEY');
  const bucket = getEnv('R2_BUCKET', 'NEXT_PUBLIC_R2_BUCKET');
  const publicUrl = getEnv('R2_PUBLIC_URL', 'NEXT_PUBLIC_R2_PUBLIC_URL');

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucket, publicUrl };
}

function getCloudinaryConfig() {
  const cloudName = getEnv('CLOUDINARY_CLOUD_NAME', 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  const apiKey = getEnv('CLOUDINARY_API_KEY', 'NEXT_PUBLIC_CLOUDINARY_API_KEY');
  const apiSecret = getEnv('CLOUDINARY_API_SECRET', 'NEXT_PUBLIC_CLOUDINARY_API_SECRET');

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

type MediaResourceType = 'image' | 'video';

function getMediaResourceType(fileType: string): MediaResourceType {
  return fileType.startsWith('video/') ? 'video' : 'image';
}

function isSupportedMimeType(fileType: string): boolean {
  return fileType.startsWith('image/') || fileType.startsWith('video/');
}

function getTransformedFileMeta(resourceType: MediaResourceType): { extension: string; contentType: string } {
  if (resourceType === 'video') {
    return { extension: 'mp4', contentType: 'video/mp4' };
  }

  return { extension: 'webp', contentType: 'image/webp' };
}

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) return '';
  return filename.substring(dotIndex + 1).toLowerCase();
}

function replaceFileExtension(filename: string, extension: string): string {
  const cleanExt = extension.replace(/^\./, '').toLowerCase();
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) {
    return `${filename}.${cleanExt}`;
  }

  return `${filename.substring(0, dotIndex)}.${cleanExt}`;
}

function randomId(length = 8): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

function buildCloudinaryTransformedUrl(publicId: string, resourceType: MediaResourceType): {
  transformedUrl: string;
  transformedExtension: string;
  transformedContentType: string;
} {
  const { extension: transformedExtension, contentType: transformedContentType } = getTransformedFileMeta(resourceType);

  const transformedUrl = cloudinary.url(publicId, {
    resource_type: resourceType,
    secure: true,
    format: transformedExtension,
    sign_url: false,
    transformation: resourceType === 'video'
      ? [{ video_codec: 'h264', audio_codec: 'aac' }]
      : [{ quality: 'auto:good' }],
  });

  return { transformedUrl, transformedExtension, transformedContentType };
}

async function uploadBufferToCloudinary(
  buffer: Buffer,
  file: File,
): Promise<{
  publicId: string;
  transformedUrl: string;
  resourceType: MediaResourceType;
  transformedExtension: string;
  transformedContentType: string;
}> {
  const resourceType = getMediaResourceType(file.type);
  const { extension: transformedExtension, contentType: transformedContentType } = getTransformedFileMeta(resourceType);
  const publicId = `riff-temp/${Date.now()}-${randomId()}`;

  const uploadOptions: UploadApiOptions = {
    resource_type: resourceType,
    public_id: publicId,
    overwrite: true,
    format: transformedExtension,
  };

  if (resourceType === 'video') {
    uploadOptions.video_codec = 'h264';
    uploadOptions.audio_codec = 'aac';
  } else {
    uploadOptions.quality = 'auto:good';
  }

  const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error('Cloudinary no retornó resultado al transformar'));
        return;
      }

      resolve(result);
    });

    stream.end(buffer);
  });

  if (!uploadResult.secure_url) {
    throw new Error('Cloudinary no devolvió una URL segura para el archivo transformado');
  }

  return {
    publicId,
    transformedUrl: uploadResult.secure_url,
    resourceType,
    transformedExtension,
    transformedContentType,
  };
}

async function fetchTransformedBuffer(url: string): Promise<Buffer> {
  const transformedResponse = await fetch(url);
  if (!transformedResponse.ok) {
    throw new Error(`No se pudo descargar el archivo transformado desde Cloudinary (${transformedResponse.status})`);
  }

  const transformedArrayBuffer = await transformedResponse.arrayBuffer();
  return Buffer.from(transformedArrayBuffer);
}

export async function POST(request: Request) {
  try {
    const { client, bucket, publicUrl } = getR2Config();
    getCloudinaryConfig();

    const requestContentType = request.headers.get('content-type') || '';

    if (requestContentType.includes('application/json')) {
      const body = (await request.json()) as {
        cloudinaryPublicId?: string;
        resourceType?: MediaResourceType;
        filename?: string;
      };

      if (!body.cloudinaryPublicId || !body.resourceType) {
        return NextResponse.json(
          { message: 'Faltan cloudinaryPublicId o resourceType para procesar el archivo.' },
          { status: 400 }
        );
      }

      const resourceType = body.resourceType === 'video' ? 'video' : 'image';
      const { transformedUrl, transformedExtension, transformedContentType } = buildCloudinaryTransformedUrl(
        body.cloudinaryPublicId,
        resourceType,
      );

      const transformedBuffer = await fetchTransformedBuffer(transformedUrl);
      const baseFilename = body.filename || `${Date.now()}-${randomId()}.${transformedExtension}`;
      const filename = replaceFileExtension(baseFilename, transformedExtension);

      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: filename,
            Body: transformedBuffer,
            ContentType: transformedContentType,
          })
        );
      } finally {
        await cloudinary.uploader
          .destroy(body.cloudinaryPublicId, { resource_type: resourceType, invalidate: false })
          .catch(() => undefined);
      }

      const url = `${publicUrl.replace(/\/$/, '')}/${filename}`;
      return NextResponse.json({ url });
    }

    const formData = await request.formData();

    // Buscar el archivo en cualquiera de las keys usadas en el cliente
    const file =
      (formData.get('file') as File | null) ??
      (formData.get('image') as File | null);

    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'No se recibió ningún archivo' }, { status: 400 });
    }

    if (!isSupportedMimeType(file.type)) {
      return NextResponse.json(
        { message: 'Tipo de archivo no soportado. Solo se permiten imágenes y videos.' },
        { status: 400 }
      );
    }

    // Obtener filename (puede venir como campo o del propio File)
    const filenameField = formData.get('filename') as string | null;
    const fallbackExt = getFileExtension(file.name) || 'bin';
    const requestedFilename = filenameField || `${Date.now()}-${randomId()}.${fallbackExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    const transformedUpload = await uploadBufferToCloudinary(originalBuffer, file);
    const transformedBuffer = await fetchTransformedBuffer(transformedUpload.transformedUrl);

    // Asegurar que el archivo en R2 mantenga la extensión del formato final.
    const filename = replaceFileExtension(requestedFilename, transformedUpload.transformedExtension);

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: filename,
          Body: transformedBuffer,
          ContentType: transformedUpload.transformedContentType,
        })
      );
    } finally {
      // Limpiar activo temporal en Cloudinary para no acumular almacenamiento.
      await cloudinary.uploader
        .destroy(transformedUpload.publicId, { resource_type: transformedUpload.resourceType, invalidate: false })
        .catch(() => undefined);
    }

    const url = `${publicUrl.replace(/\/$/, '')}/${filename}`;

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al subir archivo';
    const status = message.includes('Falta variable de entorno') ? 500 : 500;

    return NextResponse.json({ message, error: String(err) }, { status });
  }
}
