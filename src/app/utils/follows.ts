import { API_BASE_URL, getAuthHeaders } from '../config/api';

export interface FollowRecord {
  id?: string;
  followerId?: string;
  followedId?: string;
  followingId?: string;
  createdAt?: string;
}

export function extractFollowRecords(payload: unknown): FollowRecord[] {
  if (Array.isArray(payload)) return payload as FollowRecord[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: FollowRecord[] }).data;
  }
  return [];
}

export function getFollowTargetId(record: FollowRecord): string {
  return String(record.followingId ?? record.followedId ?? '');
}

export function countFollowersInRecords(records: FollowRecord[], targetId: string): number {
  return records.filter((record) => getFollowTargetId(record) === targetId).length;
}

interface FollowersTotalResponse {
  userId?: string;
  totalFollowers?: number;
  data?: {
    userId?: string;
    totalFollowers?: number;
  };
  result?: {
    userId?: string;
    totalFollowers?: number;
  };
}

function parseFollowersTotal(payload: FollowersTotalResponse): number | undefined {
  if (typeof payload?.totalFollowers === 'number') {
    return payload.totalFollowers;
  }

  if (typeof payload?.data?.totalFollowers === 'number') {
    return payload.data.totalFollowers;
  }

  if (typeof payload?.result?.totalFollowers === 'number') {
    return payload.result.totalFollowers;
  }

  return undefined;
}

export async function fetchFollowersCount(targetId: string): Promise<number | undefined> {
  if (!targetId) return undefined;

  const headers = getAuthHeaders(false);

  // Nuevo contrato de gateway: GET /users/:userId/followers/total
  // Respuesta esperada: { userId, totalFollowers }
  try {
    const totalResponse = await fetch(
      `${API_BASE_URL}/users/${encodeURIComponent(targetId)}/followers/total`,
      { headers }
    );

    if (totalResponse.ok) {
      const payload = (await totalResponse.json()) as FollowersTotalResponse;
      const parsedTotal = parseFollowersTotal(payload);
      if (typeof parsedTotal === 'number') {
        return parsedTotal;
      }
      // Si el shape no coincide, continuar con fallback legacy.
    }

    // Mapeo esperado por gateway:
    // 404 (not found) y 400 (bad request) no deben romper UI.
    // OJO: no devolvemos 0 inmediato para permitir fallback legacy en transicion.
    if (totalResponse.status === 404 || totalResponse.status === 400) {
      // Continuar con fallback.
    }

    // 504 timeout: intentar fallback legacy antes de devolver indefinido.
  } catch {
    // Silencioso: intentar fallback legacy.
  }

  const encodedTargetId = encodeURIComponent(targetId);
  let sawExplicitEmpty = false;

  for (const param of ['followingId', 'followedId']) {
    try {
      const response = await fetch(`${API_BASE_URL}/follows?${param}=${encodedTargetId}`, { headers });
      if (!response.ok) continue;

      const records = extractFollowRecords(await response.json());
      const matches = countFollowersInRecords(records, targetId);

      if (matches > 0) return matches;
      if (records.length === 0) sawExplicitEmpty = true;
    } catch {
      // silencioso
    }
  }

  try {
    const fallbackResponse = await fetch(`${API_BASE_URL}/follows`, { headers });
    if (!fallbackResponse.ok) return sawExplicitEmpty ? 0 : undefined;

    const fallbackRecords = extractFollowRecords(await fallbackResponse.json());
    return countFollowersInRecords(fallbackRecords, targetId);
  } catch {
    return sawExplicitEmpty ? 0 : undefined;
  }
}
