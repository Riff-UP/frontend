'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ProfileData {
  name: string;
  description: string;
  followers: number;
  instagram: string;
  facebook: string;
  whatsapp: string;
  email: string;
}

export default function ProfileEdit() {
  const [profileData, setProfileData] = useState<ProfileData>({
    name: 'Bisonte',
    description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit convallis lacinia inceptos, taciti mattis sodales ultricies curabitur viverra ut dictum, laoreet, metus enim tortor eleifend cras platea nascetur montes lobortis.',
    followers: 1000,
    instagram: 'bisonte_off',
    facebook: 'bisonte_off',
    whatsapp: '1234567894',
    email: 'bisonte@gmail.com',
  });

  const handleChange = (field: keyof ProfileData, value: string | number) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Guardando perfil:', profileData);
    // Aquí iría la lógica para guardar
  };

  const handleCancel = () => {
    console.log('Cancelando cambios');
    // Aquí iría la lógica para cancelar
  };

  const handleDeleteAccount = () => {
    console.log('Eliminando cuenta');
    // Aquí iría la lógica para eliminar cuenta
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="bg-riff-header border border-white/0 rounded-sm p-4 sm:p-6">
        {/* Header con foto y seguidores */}
        <div className="flex items-center gap-3 pb-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-riff-text-secondary/30 flex-shrink-0">
            <Image
              src="/images/artist.jpg"
              alt="Perfil"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold">{profileData.name}</h2>
            <p className="text-riff-text-secondary text-sm">{profileData.followers.toLocaleString()} Seguidores</p>
          </div>
        </div>
        {/* Divider line */}
        <div className="border-t-2 border-riff-primary my-4"></div>

        {/* Grid de Información personal y Redes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-4">
          {/* Información personal */}
          <div>
          <h3 className="text-riff-primary text-base font-semibold mb-3">Información personal</h3>
          
          <div className="space-y-3">
            {/* Nombre */}
            <div>
              <label className="block text-white text-sm mb-1.5">Nombre</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white placeholder-riff-text-secondary
                         focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                         transition-all duration-200"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-white text-sm mb-1.5">Descripción</label>
              <textarea
                value={profileData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white placeholder-riff-text-secondary
                         focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                         transition-all duration-200 resize-none"
              />
            </div>
          </div>
        </div>

          {/* Redes y contacto */}
          <div>
            <h3 className="text-riff-primary text-base font-semibold mb-3">Redes y contacto</h3>
            
            <div className="space-y-2.5">
              {/* Instagram */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/instagram.png"
                    alt="Instagram"
                    width={30}
                    height={30}
                  />
                </div>
                <input
                  type="text"
                  value={profileData.instagram}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  className="flex-1 px-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white placeholder-riff-text-secondary
                           focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                           transition-all duration-200"
                />
              </div>

              {/* Facebook */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/facebook_n.png"
                    alt="Facebook"
                    width={30}
                    height={30}
                  />
                </div>
                <input
                  type="text"
                  value={profileData.facebook}
                  onChange={(e) => handleChange('facebook', e.target.value)}
                  className="flex-1 px-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white placeholder-riff-text-secondary
                           focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                           transition-all duration-200"
                />
              </div>

              {/* WhatsApp */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/whatsapp.png"
                    alt="WhatsApp"
                    width={30}
                    height={30}
                  />
                </div>
                <input
                  type="text"
                  value={profileData.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  className="flex-1 px-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white placeholder-riff-text-secondary
                           focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                           transition-all duration-200"
                />
              </div>

              {/* Email */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/gmail.png"
                    alt="Gmail"
                    width={30}
                    height={30}
                  />
                </div>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="flex-1 px-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white placeholder-riff-text-secondary
                           focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                           transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Divider line */}
        <div className="border-t-2 border-riff-primary my-4"></div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <button
            onClick={handleSave}
            className="px-5 py-2 
            bg-gradient-to-r from-riff-save to-riff-save-2 
            text-white text-sm font-medium rounded-sm
            hover:from-riff-save-2 hover:to-riff-save
             transition-colors duration-200"
          >
            Guardar
          </button>
          
          <button
            onClick={handleCancel}
            className="px-5 py-2 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleDeleteAccount}
            className="px-5 py-2
            bg-gradient-to-r from-riff-delete to-riff-delete-2
            hover:from-riff-delete-2 hover:to-riff-delete
             text-white text-sm font-medium rounded-sm transition-colors duration-200 sm:ml-auto"
          >
            Eliminar cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
