'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ProfileData } from '@/app/types';
import SocialMediaInput from './profile/SocialMediaInput';
import ProfileFromToken from './profile/ProfileFromToken';
import type { UseUserReturn } from '../hooks/useUser';
import { uploadToR2, validateImageFile } from '../utils/r2Storage';
import { fetchFollowersCount } from '../utils/follows';
import { useLogout } from '../hooks/useLogout';
import DeleteConfirmModal from './common/DeleteConfirmModal';

interface ProfileEditProps {
  userState: UseUserReturn;
}

export default function ProfileEdit({ userState }: ProfileEditProps) {
  const { user, loading, error, updateUser, refreshUser, deleteAccount, setPassword, addSocialMedia, updateSocialMedia, removeSocialMedia } = userState;
  const { handleLogout } = useLogout();
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Estados para establecer contraseña
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordEstablished, setPasswordEstablished] = useState(false);

  // Mapeo de plataforma → id de red social existente
  const [socialMediaIds, setSocialMediaIds] = useState<Record<string, string>>({});
  
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
  const [uploadingImage, setUploadingImage] = useState(false);

  // Extraer plataforma y valor de URL guardada (formato: "platform:valor")
  const parseSocialMedia = (url: string): { platform: string; value: string } | null => {
    const platforms = ['instagram', 'facebook', 'whatsapp'];
    for (const p of platforms) {
      if (url.startsWith(`${p}:`)) {
        return { platform: p, value: url.substring(p.length + 1) };
      }
    }
    return null;
  };

  // Sincronizar datos del usuario cuando se carguen
  useEffect(() => {
    if (user) {
      // Mapear redes sociales por plataforma
      const socialMap: Record<string, string> = {};
      const idsMap: Record<string, string> = {};
      
      user.socialMedia?.forEach(sm => {
        const parsed = parseSocialMedia(sm.url);
        if (parsed) {
          socialMap[parsed.platform] = parsed.value;
          idsMap[parsed.platform] = sm.id;
        }
      });

      setProfileData(prev => ({
        ...prev,
        name: user.name || '',
        description: user.biography || '',
        email: user.email || '',
        instagram: socialMap.instagram || '',
        facebook: socialMap.facebook || '',
        whatsapp: socialMap.whatsapp || '',
      }));
      
      setSocialMediaIds(idsMap);

      // Cargar foto de perfil desde el backend
      if (user.profileImage) {
        setProfileImage(user.profileImage);
      }
    }
  }, [user]);

  // Cargar conteo real de seguidores desde el backend

  useEffect(() => {
    if (!user?.id) return;
    const fetchFollowers = async () => {
      try {
        const followers = await fetchFollowersCount(user.id);
        if (followers !== undefined) {
          setProfileData(prev => ({ ...prev, followers }));
        }
      } catch { /* silencioso */ }
    };
    fetchFollowers();
    // Refrescar cada 30 segundos para captar nuevos seguidores
    const interval = setInterval(fetchFollowers, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleChange = (field: keyof ProfileData, value: string | number) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setSaveMessage({ type: 'error', text: validation.error || 'Archivo inválido' });
      return;
    }

    setUploadingImage(true);
    setSaveMessage(null);

    try {
      // Preview inmediato mientras sube
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) setProfileImage(e.target.result as string);
      };
      reader.readAsDataURL(file);

      // Subir a R2
      const imageUrl = await uploadToR2(file);

      // Guardar en backend
      await updateUser({ profileImage: imageUrl });
      setProfileImage(imageUrl);
      setSaveMessage({ type: 'success', text: 'Foto de perfil actualizada' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ type: 'error', text: 'Error al subir la foto de perfil' });
    } finally {
      setUploadingImage(false);
      // Limpiar el input
      event.target.value = '';
    }
  };

  const triggerImageUpload = () => {
    const fileInput = document.getElementById('profile-image-input') as HTMLInputElement;
    fileInput?.click();
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    
    // Guardar datos del perfil
    const profileSuccess = await updateUser({
      name: profileData.name,
      email: profileData.email.trim(),
      biography: profileData.description,
    });

    // Guardar redes sociales (con prefijo de plataforma)
    const platforms: Array<'instagram' | 'facebook' | 'whatsapp'> = ['instagram', 'facebook', 'whatsapp'];
    const socialErrors: string[] = [];

    for (const platform of platforms) {
      const value = profileData[platform];
      const existingId = socialMediaIds[platform];
      const urlWithPrefix = value ? `${platform}:${value}` : '';

      try {
        if (value && existingId) {
          // Actualizar existente
          await updateSocialMedia(existingId, urlWithPrefix);
        } else if (value && !existingId) {
          // Crear nueva
          const newSm = await addSocialMedia(urlWithPrefix);
          if (newSm) {
            setSocialMediaIds(prev => ({ ...prev, [platform]: newSm.id }));
          } else {
            socialErrors.push(platform);
          }
        } else if (!value && existingId) {
          // Eliminar
          await removeSocialMedia(existingId);
          setSocialMediaIds(prev => {
            const updated = { ...prev };
            delete updated[platform];
            return updated;
          });
        }
      } catch {
        socialErrors.push(platform);
      }
    }
    
    if (profileSuccess) {
      await refreshUser();
    }

    if (profileSuccess && socialErrors.length === 0) {
      setSaveMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
    } else if (!profileSuccess) {
      setSaveMessage({ type: 'error', text: error || 'Error al guardar cambios' });
    } else if (socialErrors.length > 0) {
      setSaveMessage({ type: 'error', text: `Error al guardar: ${socialErrors.join(', ')}. Revisa la consola.` });
    }
    
    setSaving(false);
    
    // Limpiar mensaje después de 3 segundos
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleCancel = () => {
    // Restaurar datos originales del usuario
    if (user) {
      const socialMap: Record<string, string> = {};
      
      user.socialMedia?.forEach(sm => {
        const parsed = parseSocialMedia(sm.url);
        if (parsed) {
          socialMap[parsed.platform] = parsed.value;
        }
      });

      setProfileData(prev => ({
        ...prev,
        name: user.name || '',
        description: user.biography || '',
        email: user.email || '',
        instagram: socialMap.instagram || '',
        facebook: socialMap.facebook || '',
        whatsapp: socialMap.whatsapp || '',
      }));
    }
    setSaveMessage(null);
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    setShowDeleteModal(false);
    await deleteAccount();
  };

  const handleSetPassword = async () => {
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    setSavingPassword(true);
    
    const success = await setPassword(newPassword);
    
    if (success) {
      setPasswordMessage({ type: 'success', text: 'Contraseña establecida. Ahora puedes iniciar sesión con email y contraseña.' });
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setPasswordEstablished(true);
    } else {
      setPasswordMessage({ type: 'error', text: error || 'Error al establecer contraseña' });
    }

    setSavingPassword(false);
    setTimeout(() => setPasswordMessage(null), 5000);
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-riff-header border border-white/0 rounded-sm p-6 flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-riff-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-riff-text-secondary">Cargando perfil...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si hay error (probablemente CORS), mostrar datos del token
  if (error && !user) {
    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl">
          <ProfileFromToken />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="bg-riff-header border border-white/0 rounded-sm p-3 sm:p-4 md:p-6">
        {/* Header con foto y seguidores */}
        <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4">
          <div className="relative group cursor-pointer" onClick={uploadingImage ? undefined : triggerImageUpload}>
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
            {/* Overlay de hover o spinner mientras sube */}
            {uploadingImage ? (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : (
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-3.2-5c0 1.77 1.43 3.2 3.2 3.2s3.2-1.43 3.2-3.2-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2z"/>
                </svg>
              </div>
            )}
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

        {/* Sección para establecer contraseña (solo usuarios de Google sin contraseña) */}
        {user?.googleId && !user?.hasPassword && !passwordEstablished && (
          <>
            <div className="border-t-2 border-riff-primary my-3 sm:my-4"></div>
            
            <div className="pb-3 sm:pb-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-riff-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <h3 className="text-riff-primary text-sm sm:text-base font-semibold">Cuenta de Google</h3>
              </div>
              
              <p className="text-riff-text-secondary text-xs sm:text-sm mb-3">
                Tu cuenta está vinculada con Google. Puedes establecer una contraseña para también iniciar sesión con email y contraseña.
              </p>

              {passwordMessage && (
                <div className={`mb-3 p-3 rounded-sm text-sm ${
                  passwordMessage.type === 'success' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {passwordMessage.text}
                </div>
              )}

              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-riff-text-primary/40 hover:bg-riff-text-primary/60 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Establecer contraseña
                </button>
              ) : (
                <div className="space-y-3 max-w-sm">
                  <div>
                    <label className="block text-white text-xs sm:text-sm mb-1">Nueva contraseña</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-xs sm:text-sm placeholder-riff-text-secondary
                               focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                               transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-xs sm:text-sm mb-1">Confirmar contraseña</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-xs sm:text-sm placeholder-riff-text-secondary
                               focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                               transition-all duration-200"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSetPassword}
                      disabled={savingPassword}
                      className="px-4 py-2 bg-gradient-to-r from-riff-save to-riff-save-2 hover:from-riff-save-2 hover:to-riff-save text-white text-sm font-medium rounded-sm transition-colors duration-200 disabled:opacity-50"
                    >
                      {savingPassword ? 'Guardando...' : 'Guardar contraseña'}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordForm(false);
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordMessage(null);
                      }}
                      disabled={savingPassword}
                      className="px-4 py-2 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Divider line */}
        <div className="border-t-2 border-riff-primary my-3 sm:my-4"></div>

        {/* Mensaje de éxito/error */}
        {saveMessage && (
          <div className={`mb-3 p-3 rounded-sm text-sm ${
            saveMessage.type === 'success' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {saveMessage.text}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 
            bg-gradient-to-r from-riff-save to-riff-save-2 
            text-white text-sm font-medium rounded-sm
            hover:from-riff-save-2 hover:to-riff-save
             transition-colors duration-200
             disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Guardando...
              </span>
            ) : (
              'Guardar'
            )}
          </button>
          
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-5 py-2 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>
      </div>
      </div>

        {/* Zona de peligro — recuadro separado */}
        <div className="w-full max-w-4xl mt-4 bg-riff-header border border-red-500/20 rounded-sm p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleLogout}
              className="md:hidden px-5 py-2 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200"
            >
              Cerrar sesión
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-riff-delete to-riff-delete-2 hover:from-riff-delete-2 hover:to-riff-delete text-white text-sm font-medium rounded-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Eliminar cuenta
            </button>
          </div>
        </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title="Eliminar cuenta"
        message="¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer."
        onConfirm={confirmDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}