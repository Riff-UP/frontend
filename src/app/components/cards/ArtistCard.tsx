import Image from 'next/image';
import Link from 'next/link';

interface ArtistCardProps {
  id: string;
  name: string;
  image?: string;
  followers?: number;
  description?: string;
}

export default function ArtistCard({ id, name, image, followers = 0, description }: ArtistCardProps) {
  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const hasValidImage = Boolean(image && image !== '/images/default-artist.jpg');
  const biography = description?.trim() || 'Este artista aún no ha agregado una biografía.';

  return (
    <Link href={`/artist/${id}`} className="group h-full">
      <article className="h-full rounded-sm bg-riff-card p-4 sm:p-5 transition-all duration-300 hover:bg-riff-border hover:-translate-y-1">
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-riff-primary/20 ring-1 ring-white/10">
              {hasValidImage ? (
                <Image
                  src={image!}
                  alt={name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  sizes="(max-width: 640px) 56px, 64px"
                />
              ) : (
                <span className="text-2xl font-bold text-riff-primary select-none">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-white transition-colors group-hover:text-riff-primary line-clamp-1">
                {name}
              </h3>
              <p className="text-sm text-white/60 mt-0.5">
                {formatFollowers(followers)} seguidores
              </p>
            </div>
          </div>

          <p className="text-sm leading-6 text-white/75 line-clamp-3">
            {biography}
          </p>
        </div>
      </article>
    </Link>
  );
}