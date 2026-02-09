import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import ArtistCard from "@/app/components/ArtistCard";
import SongCard from "@/app/components/SongCard";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { FaCircleChevronLeft, FaCircleChevronRight } from "react-icons/fa6";

export default function Home() {
  // Datos de ejemplo - en produccion vendrian de una API
  const featuredArtists = [
    // Aqui se agregarian los artistas destacados
  ];

  const userArtists = [
    // Aqui se agregarian los artistas del usuario
  ];

  const userSongs = [
    // Aqui se agregarian las canciones del usuario
  ];

  return (
    <div className="min-h-screen bg-riff-background-b">
      <Header />
      <main className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* Hero Section */}
        <section 
          className="relative h-[300px] sm:h-[400px] lg:h-[450px] w-full max-w-8xl mx-auto overflow-hidden rounded-lg"
          style={{
            backgroundImage: "url(/images/portada.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 h-full flex items-start pt-4 sm:pt-8 lg:pt-2 px-4 sm:px-8 md:px-12 lg:px-6">
            <div className="max-w-xl">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight" 
                  style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.7)" }}>
                Con Riff, impulsa tu musica al siguiente nivel
              </h1>
            </div>
          </div>
        </section>

        {/* Artistas Destacados Section */}
        {featuredArtists.length > 0 && (
          <section className="max-w-8xl mx-auto px-0 sm:px-4 lg:px-0 py-6 sm:py-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8 px-4 sm:px-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Artistas Destacados</h2>
              <div className="flex gap-2">
                <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center group">
                  <FaCircleChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-riff-primary group-hover:text-riff-primary-dark transition-colors" />
                </button>
                <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center group">
                  <FaCircleChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-riff-primary group-hover:text-riff-primary-dark transition-colors" />
                </button>
              </div>
            </div>
            
            {/* Grid de artistas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 px-4 sm:px-0">
              {featuredArtists.map((artist) => (
                <ArtistCard key={artist.id} {...artist} />
              ))}
            </div>
          </section>
        )}

        {/* Tus Artistas Section */}
        {userArtists.length > 0 && (
          <section className="max-w-8xl mx-auto px-0 sm:px-4 lg:px-0 py-6 sm:py-12">
            <div className="flex items-center justify-between mb-6 sm:mb-8 px-4 sm:px-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Tus artistas</h2>
              <div className="flex gap-2">
                <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center group">
                  <FaCircleChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-riff-primary group-hover:text-riff-primary-dark transition-colors" />
                </button>
                <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center group">
                  <FaCircleChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-riff-primary group-hover:text-riff-primary-dark transition-colors" />
                </button>
              </div>
            </div>
            
            {/* Grid de artistas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 px-4 sm:px-0">
              {userArtists.map((artist) => (
                <ArtistCard key={artist.id} {...artist} />
              ))}
            </div>
          </section>
        )}

        {/* Tus Canciones Section */}
        {userSongs.length > 0 && (
          <section className="max-w-8xl mx-auto px-0 sm:px-4 lg:px-0 py-6 sm:py-12">
            <div className="flex items-center justify-between mb-6 sm:mb-8 px-4 sm:px-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Tus canciones</h2>
              <div className="flex gap-2">
                <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center group">
                  <FaCircleChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-riff-primary group-hover:text-riff-primary-dark transition-colors" />
                </button>
                <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center group">
                  <FaCircleChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-riff-primary group-hover:text-riff-primary-dark transition-colors" />
                </button>
              </div>
            </div>
            
            {/* Grid de canciones */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 px-4 sm:px-0">
              {userSongs.map((song) => (
                <SongCard key={song.id} {...song} />
              ))}
            </div>
          </section>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
