import ArtistProfile from '../components/ArtistProfile';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ArtistPage() {
  return (
    <div className="flex flex-col min-h-screen bg-riff-text-primary">
      {/* Header */}
      <Header />

      {/* Artist Profile Content */}
      <main className="flex-1">
        <ArtistProfile />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}