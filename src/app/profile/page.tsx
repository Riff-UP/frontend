'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/layout/Sidebar';
import MobileNav from '../components/layout/MobileNav';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ProfileEdit from '../components/ProfileEdit';
import Publications from '../components/Publications';
import Events from '../components/Events';
import Saved from '../components/Saved';
import Analytics from '../components/Analytics';
import { SavedPostsProvider } from '../context/SavedPostsContext';
import { useUser } from '../hooks/useUser';
import { getValidToken } from '../utils/jwt';

function ProfilePageContent({ activeSection, setActiveSection, userState }: { activeSection: string; setActiveSection: (s: string) => void; userState: ReturnType<typeof useUser>; }) {
  const renderContent = () => {
    switch (activeSection) {
      case 'perfil': return <ProfileEdit userState={userState} />;
      case 'publicaciones': return <Publications />;
      case 'eventos': return <Events />;
      case 'musica': return <div className="text-white text-center py-20">Sección de Música - Próximamente</div>;
      case 'guardados': return <Saved />;
      case 'estadisticas': return <Analytics />;
      default: return <ProfileEdit userState={userState} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-riff-text-primary">
      <Header />
      <MobileNav activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="flex flex-1 gap-8 sm:gap-12 lg:gap-16 p-4 sm:p-6 lg:p-8">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} user={userState.user} />
        <main className="flex-1 min-w-0 lg:pr-8">
          {renderContent()}
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState('perfil');
  const router = useRouter();
  const userState = useUser();

  useEffect(() => {
    const token = getValidToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <SavedPostsProvider userId={userState.user?.id}>
      <ProfilePageContent activeSection={activeSection} setActiveSection={setActiveSection} userState={userState} />
    </SavedPostsProvider>
  );
}
