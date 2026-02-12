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
    name: '',
    description: '',
    followers: 0,
    instagram: '',
    facebook: '',
    whatsapp: '',
    email: '',
  });

  const handleChange = (field: keyof ProfileData, value: string | number) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Lógica para guardar
  };

  const handleCancel = () => {
    // Lógica para cancelar
  };

  const handleDeleteAccount = () => {
    // Lógica para eliminar cuenta
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-4xl">
        <div className="bg-riff-header border border-white/0 rounded-sm p-3 sm:p-4 md:p-6">
        {/* Header con foto y seguidores */}
        <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4">
          <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-riff-text-secondary/30 flex-shrink-0">
          </div>
          <div>
            <h2 className="text-white text-base sm:text-lg font-semibold">{profileData.name}</h2>
            <p className="text-riff-text-secondary text-xs sm:text-sm">{profileData.followers.toLocaleString()} Seguidores</p>
          </div>
        </div>
        {/* Divider line */}
        <div className="border-t-2 border-riff-primary my-3 sm:my-4"></div>

        {/* Grid de Información personal y Redes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-3 sm:pb-4">
          {/* Información personal */}
          <div>
          <h3 className="text-riff-primary text-sm sm:text-base font-semibold mb-2 sm:mb-3">Información personal</h3>
          
          <div className="space-y-2.5 sm:space-y-3">
            {/* Nombre */}
            <div>
              <label className="block text-white text-xs sm:text-sm mb-1 sm:mb-1.5">Nombre</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-xs sm:text-sm placeholder-riff-text-secondary
                         focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                         transition-all duration-200"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-white text-xs sm:text-sm mb-1 sm:mb-1.5">Descripción</label>
              <textarea
                value={profileData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-xs sm:text-sm placeholder-riff-text-secondary
                         focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                         transition-all duration-200 resize-none"
              />
            </div>
          </div>
        </div>

          {/* Redes y contacto */}
          <div>
            <h3 className="text-riff-primary text-sm sm:text-base font-semibold mb-2 sm:mb-3">Redes y contacto</h3>
            
            <div className="space-y-2 sm:space-y-2.5">
              {/* Instagram */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/instagram.png"
                    alt="Instagram"
                    width={24}
                    height={24}
                    className="sm:w-[30px] sm:h-[30px]"
                  />
                </div>
                <input
                  type="text"
                  value={profileData.instagram}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-xs sm:text-sm placeholder-riff-text-secondary
                           focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                           transition-all duration-200"
                />
              </div>

              {/* Facebook */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/facebook_n.png"
                    alt="Facebook"
                    width={24}
                    height={24}
                    className="sm:w-[30px] sm:h-[30px]"
                  />
                </div>
                <input
                  type="text"
                  value={profileData.facebook}
                  onChange={(e) => handleChange('facebook', e.target.value)}
                  className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-xs sm:text-sm placeholder-riff-text-secondary
                           focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                           transition-all duration-200"
                />
              </div>

              {/* WhatsApp */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/whatsapp.png"
                    alt="WhatsApp"
                    width={24}
                    height={24}
                    className="sm:w-[30px] sm:h-[30px]"
                  />
                </div>
                <input
                  type="text"
                  value={profileData.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-xs sm:text-sm placeholder-riff-text-secondary
                           focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                           transition-all duration-200"
                />
              </div>

              {/* Email */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/gmail.png"
                    alt="Gmail"
                    width={24}
                    height={24}
                    className="sm:w-[30px] sm:h-[30px]"
                  />
                </div>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-xs sm:text-sm placeholder-riff-text-secondary
                           focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                           transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Divider line */}
        <div className="border-t-2 border-riff-primary my-3 sm:my-4"></div>

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
    </div>
  );
}
