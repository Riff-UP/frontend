import Image from 'next/image';

interface SocialMediaInputProps {
  platform: 'instagram' | 'facebook' | 'whatsapp' | 'email';
  value: string;
  onChange: (value: string) => void;
}

const platformConfig = {
  instagram: { icon: '/images/instagram.png', alt: 'Instagram', placeholder: '@tu_usuario' },
  facebook: { icon: '/images/facebook_n.png', alt: 'Facebook', placeholder: '@tu_usuario o URL' },
  whatsapp: { icon: '/images/whatsapp.png', alt: 'WhatsApp', placeholder: '+52 55 1234 5678' },
  email: { icon: '/images/gmail.png', alt: 'Gmail', placeholder: 'correo@ejemplo.com' },
};

export default function SocialMediaInput({ platform, value, onChange }: SocialMediaInputProps) {
  const config = platformConfig[platform];

  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      <div className="w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 flex items-center justify-center">
        <Image
          src={config.icon}
          alt={config.alt}
          width={24}
          height={24}
          className="sm:w-[30px] sm:h-[30px]"
        />
      </div>
      <input
        type={platform === 'email' ? 'email' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={config.placeholder}
        className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-xs sm:text-sm placeholder-riff-text-secondary
                 focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                 transition-all duration-200"
      />
    </div>
  );
}
