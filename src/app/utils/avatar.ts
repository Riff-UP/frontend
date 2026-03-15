export function getDicebearAvatarUrl(seed?: string): string {
  const safeSeed = (seed || 'riff-user').trim();
  const encodedSeed = encodeURIComponent(safeSeed);
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodedSeed}`;
}

function isInvalidImageValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized === 'undefined' ||
    normalized === 'null' ||
    normalized === 'nan' ||
    normalized === '[object object]'
  );
}

export function resolveProfileImage(profileImage: string | null | undefined, seed?: string): string {
  const normalized = typeof profileImage === 'string' ? profileImage.trim() : '';
  if (!isInvalidImageValue(normalized)) return normalized;
  return getDicebearAvatarUrl(seed);
}

export function normalizeDisplayName(name: string | null | undefined, fallback = 'Usuario'): string {
  const raw = String(name ?? '').trim();
  const cleaned = raw
    .replace(/\b(undefined|null|nan)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned || fallback;
}