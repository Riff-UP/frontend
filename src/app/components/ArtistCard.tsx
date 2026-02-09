import Image from 'next/image';
import Link from 'next/link';

interface ArtistCardProps {
  id: string;
  name: string;
  image: string;
  followers?: number;
  genre?: string;
}

export default function ArtistCard({ id, name, image, followers, genre }: ArtistCardProps) {
  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Link href={`/artista/${id}`} className="group">
      <div className="relative overflow-hidden rounded-lg bg-riff-header transition-all duration-300 hover:bg-riff-border cursor-pointer">
        {/* Imagen del artista */}
        <div className="relative aspect-square w-full overflow-hidden">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
        </div>

        {/* Información del artista */}
        <div className="p-4">
          <h3 className="text-white font-semibold text-lg mb-1 truncate group-hover:text-riff-primary transition-colors">
            {name}
          </h3>
          
          <div className="flex items-center gap-3 text-sm text-riff-text-secondary">
            {genre && <span className="truncate">{genre}</span>}
            {genre && followers && <span>•</span>}
            {followers !== undefined && (
              <span>{formatFollowers(followers)} seguidores</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
