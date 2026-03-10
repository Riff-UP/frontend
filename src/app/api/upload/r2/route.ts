import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

export async function POST(request: Request) {
  try {
    const { client, bucket, publicUrl } = getR2Config();
    const formData = await request.formData();

    // Buscar el archivo en cualquiera de las keys usadas en el cliente
    const file =
      (formData.get('file') as File | null) ??
      (formData.get('image') as File | null);

    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'No se recibió ningún archivo' }, { status: 400 });
    }

    // Obtener filename (puede venir como campo o del propio File)
    const filenameField = formData.get('filename') as string | null;
    const filename = filenameField || `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${file.name.split('.').pop()}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const url = `${publicUrl.replace(/\/$/, '')}/${filename}`;

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al subir archivo';
    const status = message.includes('Falta variable de entorno') ? 500 : 500;

    return NextResponse.json({ message, error: String(err) }, { status });
  }
}
