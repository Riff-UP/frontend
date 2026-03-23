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

  // Contrato actual de gateway: GET /users/:userId/followers/total
  const totalResponse = await fetch(
    `${API_BASE_URL}/users/${encodeURIComponent(targetId)}/followers/total`,
    { headers }
  );

  if (!totalResponse.ok) {
    if (totalResponse.status === 400 || totalResponse.status === 404) {
      return 0;
    }
    return undefined;
  }

  const payload = (await totalResponse.json()) as FollowersTotalResponse;
  const parsedTotal = parseFollowersTotal(payload);
  return typeof parsedTotal === 'number' ? parsedTotal : undefined;
}
