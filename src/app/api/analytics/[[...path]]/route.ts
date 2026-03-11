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

const RETRYABLE_OAUTH_ERROR_CODES = new Set([
  'invalid_client',
  'unauthorized_client',
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

function getForwardedPort(request: NextRequest, protocol: string): string {
  if (request.nextUrl.port) {
    return request.nextUrl.port;
  }

  return protocol === 'https' ? '443' : '80';
}

function buildForwardHeaders(source: Headers, request: NextRequest): Headers {
  const headers = new Headers();

  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const protocol = request.nextUrl.protocol.replace(/:$/, '') || 'https';
  const host = request.nextUrl.host;
  const port = getForwardedPort(request, protocol);
  const uri = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  headers.set('x-forwarded-host', host);
  headers.set('x-forwarded-proto', protocol);
  headers.set('x-forwarded-port', port);
  headers.set('x-forwarded-uri', uri);
  headers.set('forwarded', `host=${host};proto=${protocol}`);

  if (request.nextUrl.pathname === '/api/analytics' || request.nextUrl.pathname.startsWith('/api/analytics/')) {
    headers.set('x-forwarded-prefix', '/api/analytics');
  }

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

function toNextResponse(response: Response): Promise<NextResponse> {
  return response.arrayBuffer().then((body) => new NextResponse(body, {
    status: response.status,
    headers: buildResponseHeaders(response.headers),
  }));
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 && status <= 599;
}

async function shouldRetryAlternateCandidateForOAuth(response: Response): Promise<boolean> {
  if (response.status !== 400) {
    return false;
  }

  try {
    const payload = await response.clone().json() as Record<string, unknown>;
    const details = payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
      ? payload.details as Record<string, unknown>
      : null;
    const errorCode = typeof details?.error === 'string'
      ? details.error.trim().toLowerCase()
      : typeof payload.error === 'string'
        ? payload.error.trim().toLowerCase()
        : '';

    return RETRYABLE_OAUTH_ERROR_CODES.has(errorCode);
  } catch {
    return false;
  }
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
  let lastRetryableResponse: Response | null = null;
  let lastNetworkError: Error | null = null;

  for (const baseUrl of candidates) {
    try {
      const upstreamResponse = await fetch(`${baseUrl}${suffix}${search}`, {
        method: request.method,
        headers: buildForwardHeaders(request.headers, request),
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

      if (candidates.length > 1) {
        if (isRetryableStatus(upstreamResponse.status)) {
          lastRetryableResponse = upstreamResponse;
          continue;
        }

        if (await shouldRetryAlternateCandidateForOAuth(upstreamResponse)) {
          lastRetryableResponse = upstreamResponse;
          continue;
        }
      }

      return toNextResponse(upstreamResponse);
    } catch (error) {
      lastNetworkError = error instanceof Error ? error : new Error('No se pudo conectar con el gateway de analytics.');
      if (candidates.length === 1) {
        break;
      }
    }
  }

  if (lastRetryableResponse) {
    return toNextResponse(lastRetryableResponse);
  }

  if (lastNetworkError) {
    return NextResponse.json(
      {
        message: lastNetworkError.message,
      },
      { status: 502 },
    );
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
