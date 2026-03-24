import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full theme-shell-footer theme-force-light-text border-t border-white/5 mt-8 sm:mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Logo Riff */}
          <div className="flex items-center">
              <Image
                src="/images/logo_riff_b.png"
                alt="Riff Logo"
                width={100}
                height={50}
                className="object-contain sm:w-[120px] sm:h-[60px]"
              />
            
          </div>

          {/* Logos de instituciones asociadas */}
          <div className="flex items-center gap-4 sm:gap-8 flex-wrap justify-center">
            <div className="text-riff-background text-xs sm:text-sm font-medium">
              De parte de:
            </div>
            <Image 
            src="/images/team.png" 
            alt="Institución Logo" 
            width={80}
            height={40} 
            className="object-contain sm:w-[100px] sm:h-[50px]"
            />
            <Image 
            src="/images/up.png" 
            alt="Institución Logo" 
            width={160}
            height={40} 
            className="object-contain sm:w-[200px] sm:h-[50px]"
            />
          </div>
        </div>

        {/* Copyright y links */}
        <div className="border-t border-riff-background/30 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs sm:text-sm text-riff-background/60">
            <p>© {new Date().getFullYear()} Riff. Todos los derechos reservados.</p>
            <Link 
              href="/privacy" 
              className="hover:text-riff-background transition-colors underline underline-offset-4"
            >
              Política de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
