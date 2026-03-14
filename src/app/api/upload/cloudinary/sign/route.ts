import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export const runtime = 'nodejs';

function getEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Falta variable de entorno: ${names.join(' o ')}`);
}

function configureCloudinary() {
  const cloudName = getEnv('CLOUDINARY_CLOUD_NAME', 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  const apiKey = getEnv('CLOUDINARY_API_KEY', 'NEXT_PUBLIC_CLOUDINARY_API_KEY');
  const apiSecret = getEnv('CLOUDINARY_API_SECRET', 'NEXT_PUBLIC_CLOUDINARY_API_SECRET');

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return { cloudName, apiKey, apiSecret };
}

export async function POST(request: Request) {
  try {
    const { cloudName, apiKey, apiSecret } = configureCloudinary();
    const body = (await request.json()) as {
      paramsToSign?: {
        timestamp?: number;
        folder?: string;
        public_id?: string;
      };
    };

    const params = body.paramsToSign;
    if (!params?.timestamp || !params.folder || !params.public_id) {
      return NextResponse.json(
        { message: 'Faltan parámetros para firmar la subida.' },
        { status: 400 },
      );
    }

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: params.timestamp,
        folder: params.folder,
        public_id: params.public_id,
      },
      apiSecret,
    );

    return NextResponse.json({
      signature,
      timestamp: params.timestamp,
      apiKey,
      cloudName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al firmar subida de Cloudinary';
    return NextResponse.json({ message }, { status: 500 });
  }
}
