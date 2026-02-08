import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-riff-header border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo Riff */}
          <div className="flex items-center">
              <Image
                src="/images/logo_riff_b.png"
                alt="Riff Logo"
                width={120}
                height={60}
                className="object-contain"
              />
            
          </div>

          {/* Logos de instituciones asociadas */}
          <div className="flex items-center gap-8 flex-wrap justify-center">
            <div className="text-riff-background text-sm font-medium">
              De parte de:
            </div>
            <Image 
            src="/images/team.png" 
            alt="Institución Logo" 
            width={100}
            height={50} 
            className="object-contain"
            />
            <Image 
            src="/images/up.png" 
            alt="Institución Logo" 
            width={200}
            height={50} 
            className="object-contain"
            />
          </div>
        </div>

        {/* Copyright y links */}
        <div className="border-t border-riff-background/30 py-6">
          <div className="flex flex-col  items-center text-sm text-riff-background/60">
            <p>© {new Date().getFullYear()} Riff. Todos los derechos reservados.</p>
            
          </div>
        </div>
      </div>
    </footer>
  );
}
