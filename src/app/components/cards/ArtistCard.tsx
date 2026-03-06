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
      <article className="h-full rounded-xl bg-riff-card p-4 sm:p-5 transition-all duration-300 hover:bg-riff-border hover:-translate-y-1">
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-riff-primary/20 ring-1 ring-white/10">
              {hasValidImage ? (
                <Image
                  src={image!}
                  alt={name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  sizes="(max-width: 640px) 64px, 80px"
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold text-riff-primary select-none">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-semibold text-white transition-colors group-hover:text-riff-primary line-clamp-2">
                {name}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-white/50">
                Perfil de artista
              </p>
            </div>
          </div>

          <p className="flex-1 text-sm leading-6 text-white/75 line-clamp-4 min-h-[96px]">
            {biography}
          </p>

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2.5">
            <span className="text-xs uppercase tracking-[0.18em] text-white/45">
              Seguidores
            </span>
            <span className="text-sm sm:text-base font-semibold text-white">
              {formatFollowers(followers)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}