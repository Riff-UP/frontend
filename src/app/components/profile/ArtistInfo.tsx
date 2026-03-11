import Image from 'next/image';
import { ArtistData } from '@/app/types';

interface ArtistInfoProps {
  artist: ArtistData;
  followButton?: React.ReactNode;
}

export default function ArtistInfo({ artist, followButton }: ArtistInfoProps) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {/* Avatar */}
      <div className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-white/20 bg-riff-primary/20 flex-shrink-0 flex items-center justify-center">
        {artist.profileImage ? (
          <Image
            src={artist.profileImage}
            alt={artist.name}
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl sm:text-4xl font-bold text-riff-primary select-none">
            {artist.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="text-white text-lg sm:text-2xl lg:text-3xl font-bold leading-tight">
          {artist.name}
        </h1>
        {artist.followers !== undefined && (
          <p className="text-white/70 text-xs sm:text-sm mt-0.5">
            {artist.followers.toLocaleString()} seguidores
          </p>
        )}
        {followButton && <div className="mt-2">{followButton}</div>}
      </div>
    </div>
  );
}