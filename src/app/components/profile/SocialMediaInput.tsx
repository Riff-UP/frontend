import Image from 'next/image';

interface SocialMediaInputProps {
  platform: 'instagram' | 'facebook' | 'whatsapp' | 'email';
  value: string;
  onChange: (value: string) => void;
}

const platformConfig = {
  instagram: { icon: '/images/instagram.png', alt: 'Instagram', placeholder: '@tu_usuario' },
  facebook: { icon: '/images/facebook_n.png', alt: 'Facebook', placeholder: '@tu_usuario o URL' },
  whatsapp: { icon: '/images/whatsapp.png', alt: 'WhatsApp', placeholder: '+52 656 123 4567' },
  email: { icon: '/images/gmail.png', alt: 'Gmail', placeholder: 'correo@ejemplo.com' },
};

// Formatea dígitos como: +52 656 123 4567
function formatPhone(raw: string): string {
  // Mantener el + inicial si existe
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  // Grupos: [codigo pais 2] [3] [3] [4] → ej. 52 656 123 4567
  const parts: string[] = [];
  if (hasPlus && digits.length >= 2) {
    parts.push(digits.slice(0, 2));       // código país
    if (digits.length > 2)  parts.push(digits.slice(2, 5));   // área
    if (digits.length > 5)  parts.push(digits.slice(5, 8));   // primeros 3
    if (digits.length > 8)  parts.push(digits.slice(8, 12));  // últimos 4
  } else {
    if (digits.length > 0)  parts.push(digits.slice(0, 3));
    if (digits.length > 3)  parts.push(digits.slice(3, 6));
    if (digits.length > 6)  parts.push(digits.slice(6, 10));
  }
  return (hasPlus ? '+' : '') + parts.join(' ');
}

export default function SocialMediaInput({ platform, value, onChange }: SocialMediaInputProps) {
  const config = platformConfig[platform];

  const handleChange = (raw: string) => {
    if (platform === 'whatsapp') {
      // Solo permitir dígitos y + al inicio
      const sanitized = raw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
      // Guardar sin espacios (guardar el valor limpio)
      const digits = sanitized.replace(/\D/g, '');
      const withPlus = sanitized.startsWith('+') ? '+' + digits : digits;
      // Limitar a 13 caracteres (+ + 12 dígitos)
      onChange(withPlus.slice(0, 13));
    } else {
      onChange(raw);
    }
  };

  // Mostrar formateado visualmente en el input
  const displayValue = platform === 'whatsapp' ? formatPhone(value) : value;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      <div className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center">
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
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={config.placeholder}
        inputMode={platform === 'whatsapp' ? 'tel' : undefined}
        className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-xs sm:text-sm placeholder-riff-text-secondary
                 focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                 transition-all duration-200"
      />
    </div>
  );
}
