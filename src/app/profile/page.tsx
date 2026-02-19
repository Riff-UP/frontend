'use client';

import { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import MobileNav from '../components/layout/MobileNav';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ProfileEdit from '../components/ProfileEdit';
import Publications from '../components/Publications';
import Events from '../components/Events';
import Saved from '../components/Saved';
import Analytics from '../components/Analytics';

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState('perfil');

  const renderContent = () => {
    switch (activeSection) {
      case 'perfil':
        return <ProfileEdit />;
      case 'publicaciones':
        return <Publications />;
      case 'eventos':
        return <Events />;
      case 'musica':
        return <div className="text-white text-center py-20">Sección de Música - Próximamente</div>;
      case 'guardados':
        return <Saved />;
      case 'estadisticas':
        return <Analytics />;
      default:
        return <ProfileEdit />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-riff-text-primary">
      {/* Header */}
      <Header />

      {/* Mobile Navigation */}
      <MobileNav 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
      />

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 gap-8 sm:gap-12 lg:gap-16 p-4 sm:p-6 lg:p-8">
        {/* Sidebar - Hidden on mobile */}
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 pr-4 sm:pr-8 lg:pr-12">
          {renderContent()}
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
