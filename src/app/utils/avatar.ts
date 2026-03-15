export function getDicebearAvatarUrl(seed?: string): string {
  const safeSeed = (seed || 'riff-user').trim();
  const encodedSeed = encodeURIComponent(safeSeed);
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodedSeed}`;
}

export function resolveProfileImage(profileImage: string | null | undefined, seed?: string): string {
  const normalized = typeof profileImage === 'string' ? profileImage.trim() : '';
  if (normalized) return normalized;
  return getDicebearAvatarUrl(seed);
}