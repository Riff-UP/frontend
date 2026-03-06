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

export async function fetchFollowersCount(targetId: string): Promise<number | undefined> {
  if (!targetId) return undefined;

  const headers = getAuthHeaders(false);
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
