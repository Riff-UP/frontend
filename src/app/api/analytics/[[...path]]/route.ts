import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/app/config/api';

export const dynamic = 'force-dynamic';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function stripApiSuffix(value: string): string {
  return value.replace(/\/api$/, '');
}

function normalizeAnalyticsBase(value: string): string {
  const cleaned = stripTrailingSlash(value.trim());

  if (!cleaned) {
    return '';
  }

  if (cleaned.endsWith('/analytics')) {
    return cleaned;
  }

  if (cleaned.endsWith('/api')) {
    return `${cleaned}/analytics`;
  }

  return `${cleaned}/analytics`;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function getAnalyticsBaseCandidates(): string[] {
  const explicitBase = process.env.ANALYTICS_API_URL || process.env.NEXT_PUBLIC_ANALYTICS_API_URL;

  if (explicitBase?.trim()) {
    return [normalizeAnalyticsBase(explicitBase)];
  }

  const apiBase = stripTrailingSlash(API_BASE_URL);

  return unique([
    normalizeAnalyticsBase(apiBase),
    normalizeAnalyticsBase(stripApiSuffix(apiBase)),
  ]);
}

function buildForwardHeaders(source: Headers): Headers {
  const headers = new Headers();

  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  return headers;
}

function buildResponseHeaders(source: Headers): Headers {
  const headers = new Headers();

  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  return headers;
}

async function resolvePathSegments(context: { params: Promise<{ path?: string[] }> | { path?: string[] } }): Promise<string[]> {
  const { path = [] } = await Promise.resolve(context.params);
  return path;
}

async function proxyAnalyticsRequest(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> | { path?: string[] } },
): Promise<NextResponse> {
  const pathSegments = await resolvePathSegments(context);
  const suffix = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';
  const search = request.nextUrl.search;
  const requestBody = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await request.text();

  const candidates = getAnalyticsBaseCandidates();
  let notFoundCount = 0;

  for (const baseUrl of candidates) {
    try {
      const upstreamResponse = await fetch(`${baseUrl}${suffix}${search}`, {
        method: request.method,
        headers: buildForwardHeaders(request.headers),
        body: requestBody,
        cache: 'no-store',
        redirect: 'manual',
      });

      if (upstreamResponse.status === 404) {
        notFoundCount += 1;
        if (notFoundCount < candidates.length) {
          continue;
        }

        return NextResponse.json(
          {
            message: `El gateway configurado no expone el endpoint analytics ${suffix || '/'}${search}.`,
          },
          { status: 404 },
        );
      }

      const body = await upstreamResponse.arrayBuffer();
      return new NextResponse(body, {
        status: upstreamResponse.status,
        headers: buildResponseHeaders(upstreamResponse.headers),
      });
    } catch (error) {
      return NextResponse.json(
        {
          message: error instanceof Error ? error.message : 'No se pudo conectar con el gateway de analytics.',
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    { message: 'No hay una base configurada para analytics.' },
    { status: 500 },
  );
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return proxyAnalyticsRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return proxyAnalyticsRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return proxyAnalyticsRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return proxyAnalyticsRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return proxyAnalyticsRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return proxyAnalyticsRequest(request, context);
}
