import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProfileEdit from '../components/ProfileEdit';

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
          <ProfileEdit />
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
