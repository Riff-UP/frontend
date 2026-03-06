'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getValidToken, getUserFromToken } from '../utils/jwt';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

export interface SocialMedia {
  id: string;
  url: string;
}

type SocialMediaResponse = SocialMedia[] | { data?: SocialMedia[] } | null;

export interface UserData {
  id: string;
  name: string;
  email: string;
  googleId?: string | null;
  hasPassword?: boolean;
  biography?: string | null;
  profileImage?: string | null;
  role: 'USER' | 'ARTIST';
  status: boolean;
  createdAt: string;
  socialMedia?: SocialMedia[];
}

interface UseUserReturn {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  updateUser: (data: Partial<UserData>) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  setPassword: (password: string) => Promise<boolean>;
  addSocialMedia: (url: string) => Promise<SocialMedia | null>;
  updateSocialMedia: (id: string, url: string) => Promise<boolean>;
  removeSocialMedia: (id: string) => Promise<boolean>;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getToken = (): string | null => {
    return getValidToken(); // Usa la utilidad que valida expiración
  };

  const fetchUser = useCallback(async () => {
    const token = getToken();
    
    if (!token) {
      setUser(null);
      setLoading(false);
      setError('No hay sesión activa');
      return;
    }

    const tokenData = getUserFromToken(token);
    if (!tokenData || !tokenData.id) {
      setUser(null);
      setLoading(false);
      setError('Token inválido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.message || 'Error al obtener usuario');
        setUser(null);
        return;
      }

      const userData = await res.json();
      const userId = userData.id || tokenData.id;

      try {
        let smData: SocialMediaResponse = null;
        try {
          const smQueryRes = await fetch(`${API_URL}/social-media?userId=${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (smQueryRes.ok) {
            smData = await smQueryRes.json();
          } else {
            const smRes = await fetch(`${API_URL}/social-media/user/${userId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (smRes.ok) {
              smData = await smRes.json();
            }
          }
        } catch {
          try {
            const smRes = await fetch(`${API_URL}/social-media/user/${userId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (smRes.ok) {
              smData = await smRes.json();
            }
          } catch { /* silencioso */ }
        }

        if (smData) {
          userData.socialMedia = Array.isArray(smData) ? smData : (smData?.data ?? []);
        } else {
          userData.socialMedia = userData.socialMedia || [];
        }
      } catch {
        userData.socialMedia = userData.socialMedia || [];
      }

      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const updateUser = async (data: Partial<UserData>): Promise<boolean> => {
    const token = getToken();
    
    if (!token || !user) {
      setError('No hay sesión activa');
      return false;
    }

    try {
      setError(null);

      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return false;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.message || 'Error al actualizar');
        return false;
      }

      const updatedUser = await res.json();
      setUser(prev => ({ ...(prev || {}), ...updatedUser, socialMedia: prev?.socialMedia } as UserData));
      window.dispatchEvent(new Event('authChange'));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
      return false;
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    const token = getToken();
    
    if (!token || !user) {
      setError('No hay sesión activa');
      return false;
    }

    try {
      setError(null);

      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.message || 'Error al eliminar cuenta');
        return false;
      }

      localStorage.removeItem('token');
      router.push('/login');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar cuenta');
      return false;
    }
  };

  const setPassword = async (password: string): Promise<boolean> => {
    const token = getToken();
    
    if (!token || !user) {
      setError('No hay sesión activa');
      return false;
    }

    try {
      setError(null);

      const res = await fetch(`${API_URL}/users/${user.id}/password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword: password }),
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return false;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.message || 'Error al establecer contraseña');
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al establecer contraseña');
      return false;
    }
  };

  const addSocialMedia = async (url: string): Promise<SocialMedia | null> => {
    const token = getToken();
    
    if (!token || !user) {
      setError('No hay sesión activa');
      return null;
    }

    try {
      setError(null);

      const payload = { userId: user.id, url };
      console.log('📱 addSocialMedia payload:', payload);

      const res = await fetch(`${API_URL}/social-media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = Array.isArray(errorData?.message) ? errorData.message.join(', ') : (errorData?.message || 'Error al agregar red social');
        console.error('❌ addSocialMedia error:', errorData);
        setError(msg);
        return null;
      }

      const newSocialMedia = await res.json();
      console.log('✅ addSocialMedia result:', newSocialMedia);

      setUser(prev => prev ? {
        ...prev,
        socialMedia: [...(prev.socialMedia || []), newSocialMedia]
      } : null);

      return newSocialMedia;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar red social');
      return null;
    }
  };

  const updateSocialMedia = async (id: string, url: string): Promise<boolean> => {
    const token = getToken();
    
    if (!token || !user) {
      setError('No hay sesión activa');
      return false;
    }

    try {
      setError(null);

      console.log('📱 updateSocialMedia:', { id, url });

      const res = await fetch(`${API_URL}/social-media/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = Array.isArray(errorData?.message) ? errorData.message.join(', ') : (errorData?.message || 'Error al actualizar red social');
        console.error('❌ updateSocialMedia error:', errorData);
        setError(msg);
        return false;
      }

      console.log('✅ updateSocialMedia ok');
      setUser(prev => prev ? {
        ...prev,
        socialMedia: prev.socialMedia?.map(sm => sm.id === id ? { ...sm, url } : sm)
      } : null);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar red social');
      return false;
    }
  };

  const removeSocialMedia = async (id: string): Promise<boolean> => {
    const token = getToken();
    
    if (!token || !user) {
      setError('No hay sesión activa');
      return false;
    }

    try {
      setError(null);

      console.log('📱 removeSocialMedia:', id);

      const res = await fetch(`${API_URL}/social-media/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = Array.isArray(errorData?.message) ? errorData.message.join(', ') : (errorData?.message || 'Error al eliminar red social');
        console.error('❌ removeSocialMedia error:', errorData);
        setError(msg);
        return false;
      }

      console.log('✅ removeSocialMedia ok');
      setUser(prev => prev ? {
        ...prev,
        socialMedia: prev.socialMedia?.filter(sm => sm.id !== id)
      } : null);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar red social');
      return false;
    }
  };

  useEffect(() => {
    fetchUser();
    window.addEventListener('authChange', fetchUser);
    window.addEventListener('storage', fetchUser);
    return () => {
      window.removeEventListener('authChange', fetchUser);
      window.removeEventListener('storage', fetchUser);
    };
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    updateUser,
    refreshUser: fetchUser,
    deleteAccount,
    setPassword,
    addSocialMedia,
    updateSocialMedia,
    removeSocialMedia,
  };
}
