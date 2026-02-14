'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ProfileData } from '@/app/types';
import SocialMediaInput from './profile/SocialMediaInput';

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

  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handleChange = (field: keyof ProfileData, value: string | number) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setProfileImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerImageUpload = () => {
    const fileInput = document.getElementById('profile-image-input') as HTMLInputElement;
    fileInput?.click();
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
          <div className="relative group cursor-pointer" onClick={triggerImageUpload}>
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-riff-text-secondary/30 flex-shrink-0">
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt="Profile"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-riff-text-secondary">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
            </div>
            {/* Overlay de hover */}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-3.2-5c0 1.77 1.43 3.2 3.2 3.2s3.2-1.43 3.2-3.2-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2z"/>
              </svg>
            </div>
          </div>
          <input
            id="profile-image-input"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
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
              <SocialMediaInput
                platform="instagram"
                value={profileData.instagram}
                onChange={(value) => handleChange('instagram', value)}
              />
              <SocialMediaInput
                platform="facebook"
                value={profileData.facebook}
                onChange={(value) => handleChange('facebook', value)}
              />
              <SocialMediaInput
                platform="whatsapp"
                value={profileData.whatsapp}
                onChange={(value) => handleChange('whatsapp', value)}
              />
              <SocialMediaInput
                platform="email"
                value={profileData.email}
                onChange={(value) => handleChange('email', value)}
              />
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
