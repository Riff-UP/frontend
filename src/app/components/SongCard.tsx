import Image from 'next/image';
import Link from 'next/link';
import { FaPlay } from 'react-icons/fa';

interface SongCardProps {
  id: string;
  title: string;
  artist: string;
  image: string;
  plays?: number;
}

export default function SongCard({ id, title, artist, image, plays }: SongCardProps) {
  const formatPlays = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Link href={`/cancion/${id}`} className="group">
      <div className="relative overflow-hidden rounded-lg transition-all duration-300 cursor-pointer">
        {/* Imagen de la cancion con texto sobrepuesto */}
        <div className="relative aspect-square w-full overflow-hidden">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
          
          {/* Gradiente oscuro en la parte inferior */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Badge de reproducciones arriba a la derecha */}
          {plays && (
            <div className="absolute top-3 right-3 bg-black/60 text-white text-sm font-medium px-2.5 py-1 rounded flex items-center gap-1.5">
              <FaPlay className="w-3 h-3" />
              {formatPlays(plays)}
            </div>
          )}
          
          {/* Informacion de la cancion sobre la imagen */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-bold text-lg mb-1 truncate group-hover:text-riff-primary transition-colors">
              {title}
            </h3>
            
            <p className="text-white text-sm truncate">
              {artist}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
