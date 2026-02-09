import Image from 'next/image';
import Link from 'next/link';

interface ArtistCardProps {
  id: string;
  name: string;
  image: string;
  followers?: number;
  description?: string;
}

export default function ArtistCard({ id, name, image, followers, description }: ArtistCardProps) {
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
      <div className="relative overflow-hidden rounded-lg bg-riff-card transition-all duration-300 hover:bg-riff-border cursor-pointer p-4">
        {/* Layout horizontal: imagen + info */}
        <div className="flex items-start gap-4 mb-3">
          {/* Imagen del artista - circular pequena */}
          <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-full">
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="80px"
            />
          </div>

          {/* Info del artista a la derecha */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-lg mb-1 group-hover:text-riff-primary transition-colors">
              {name}
            </h3>
            
            {followers !== undefined && (
              <p className="text-white text-sm">
                {formatFollowers(followers)} seguidores
              </p>
            )}
          </div>
        </div>
        
        {/* Descripcion debajo */}
        {description && (
          <p className="text-white text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}
