import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.NEXT_PUBLIC_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_R2_ACCESS_KEY!,
    secretAccessKey: process.env.NEXT_PUBLIC_R2_SECRET_KEY!,
  },
});

const BUCKET = process.env.NEXT_PUBLIC_R2_BUCKET!;
const PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

export async function POST(request: Request) {
  try {
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

    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const url = `${PUBLIC_URL.replace(/\/$/, '')}/${filename}`;

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ message: 'Error al subir archivo', error: String(err) }, { status: 500 });
  }
}
