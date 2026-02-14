import Image from 'next/image';
import { ArtistData } from '@/app/types';

interface ArtistInfoProps {
  artist: ArtistData;
}

export default function ArtistInfo({ artist }: ArtistInfoProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-8">
      {artist.profileImage && (
        <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-4 border-white/20 bg-riff-text-secondary/30 flex-shrink-0">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url('${artist.profileImage}')` }}
          ></div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-white text-xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">
          {artist.name}
        </h1>
        <p className="text-white text-xs sm:text-base mb-2 sm:mb-3">
          {artist.followers.toLocaleString()} seguidores
        </p>
        <p className="text-white text-xs sm:text-sm leading-relaxed max-w-lg mb-3 sm:mb-4 line-clamp-3 sm:line-clamp-none">
          {artist.description}
        </p>

        {/* Social Media Icons - Vertical layout */}
        <div className="flex flex-col gap-1 sm:gap-2">
          {artist.instagram && (
            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
              <Image src="/images/instagram.png" alt="Instagram" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="truncate">{artist.instagram}</span>
            </div>
          )}
          {artist.facebook && (
            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
              <Image src="/images/facebook_n.png" alt="Facebook" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="truncate">{artist.facebook}</span>
            </div>
          )}
          {artist.whatsapp && (
            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
              <Image src="/images/whatsapp.png" alt="WhatsApp" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="truncate">{artist.whatsapp}</span>
            </div>
          )}
          {artist.email && (
            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
              <Image src="/images/gmail.png" alt="Gmail" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="truncate">{artist.email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
