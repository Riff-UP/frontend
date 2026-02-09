import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ProfilePage() {
  return (
    <div className="flex flex-col min-h-screen bg-riff-text-primary">
      {/* Header */}
      <Header />

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 gap-6 p-6">
        {/* Sidebar */}
        <Sidebar activeSection="perfil" />

        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Mi Perfil</h1>
            
            {/* Contenido del perfil - se implementará después */}
            <div className="bg-riff-card border border-white/10 rounded-sm p-8">
              <p className="text-riff-text-secondary">
                Contenido del perfil (se implementará en el siguiente paso)
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
