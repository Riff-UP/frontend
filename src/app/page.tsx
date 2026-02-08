import Header from "@/app/components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative h-[500px] w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0D0D0D]" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="max-w-2xl">
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
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
    </div>
  );
}
