import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex relative">
      <div 
        className="auth-bg-motion absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/fondo_n.jpg)' }}
      >
        <div className="absolute inset-0 bg-riff-overlay/40"></div>
        <div className="auth-light-sweep absolute inset-0"></div>
      </div>

      <div className="w-full lg:w-[35%] bg-white/60 backdrop-blur-md flex flex-col min-h-screen relative z-10">
        <div className="p-8">
          <Image
            src="/images/logo_riff.png"
            alt="Riff Logo"
            width={90}
            height={45}
            className="object-contain"
          />
        </div>
        
        <div className="flex-1 flex items-center justify-center px-8 lg:px-16 pb-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:w-[55%] relative z-10"></div>
    </div>
  );
}
