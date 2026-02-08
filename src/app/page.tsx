import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-riff-background-b">
      <Header />
      <main className="px-4 sm:px-6 lg:px-8 pt-6">
        {/* Hero Section */}
        <section 
          className="relative h-[450px] w-full max-w-8xl mx-auto overflow-hidden rounded-lg"
          style={{
            backgroundImage: 'url(/images/portada.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 h-full flex items-start pt-2 px-2 md:px-12 lg:px-6">
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight" 
                  style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
                Con Riff, impulsa tu música al siguiente nivel
              </h1>
            </div>
          </div>
        </section>

        {/* Artistas Destacados Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Artistas Destacados</h2>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                ←
              </button>
              <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                →
              </button>
            </div>
          </div>
          
          {/* Grid de artistas - placeholder */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Los componentes de artistas irán aquí */}
          </div>
        </section>

        {/* Tus Artistas Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Tus artistas</h2>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                ←
              </button>
              <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                →
              </button>
            </div>
          </div>
          
          {/* Grid de artistas - placeholder */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Los componentes de artistas irán aquí */}
          </div>
        </section>

        {/* Tus Canciones Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-white mb-8">Tus canciones</h2>
          
          {/* Grid de canciones - placeholder */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Los componentes de canciones irán aquí */}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
