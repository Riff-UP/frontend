import Image from 'next/image';
import { ArtistData } from '@/app/types';

interface ArtistInfoProps {
  artist: ArtistData;
}

// Extrae el valor de una red social por prefijo (ej: "instagram:usuario")
function getSocialValue(socialMedia: { id: string; url: string }[] | undefined, platform: string): string | null {
  const match = socialMedia?.find(sm => sm.url.startsWith(`${platform}:`));
  return match ? match.url.substring(platform.length + 1) : null;
}

export default function ArtistInfo({ artist }: ArtistInfoProps) {
  const instagram = getSocialValue(artist.socialMedia, 'instagram');
  const facebook = getSocialValue(artist.socialMedia, 'facebook');
  const whatsapp = getSocialValue(artist.socialMedia, 'whatsapp');
  const email = getSocialValue(artist.socialMedia, 'email');

  return (
    <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-8">
      {/* Avatar */}
      <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-4 border-white/20 bg-riff-primary/20 flex-shrink-0 flex items-center justify-center">
        {artist.profileImage ? (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url('${artist.profileImage}')` }}
          />
        ) : (
          <span className="text-4xl sm:text-5xl font-bold text-riff-primary select-none">
            {artist.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="text-white text-xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">
          {artist.name}
        </h1>

        {artist.followers !== undefined && (
          <p className="text-white text-xs sm:text-base mb-2 sm:mb-3">
            {artist.followers.toLocaleString()} seguidores
          </p>
        )}

        {artist.biography && (
          <p className="text-white text-xs sm:text-sm leading-relaxed max-w-lg mb-3 sm:mb-4 line-clamp-3 sm:line-clamp-none">
            {artist.biography}
          </p>
        )}

        {/* Redes sociales */}
        <div className="flex flex-col gap-1 sm:gap-2">
          {instagram && (
            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
              <Image src="/images/instagram.png" alt="Instagram" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="truncate">{instagram}</span>
            </div>
          )}
          {facebook && (
            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
              <Image src="/images/facebook_n.png" alt="Facebook" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="truncate">{facebook}</span>
            </div>
          )}
          {whatsapp && (
            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
              <Image src="/images/whatsapp.png" alt="WhatsApp" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="truncate">{whatsapp}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
              <Image src="/images/gmail.png" alt="Gmail" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="truncate">{email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}