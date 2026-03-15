'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getValidToken, getUserFromToken } from '../utils/jwt';
import { API_BASE_URL } from '../config/api';
import { normalizeDisplayName, resolveProfileImage } from '../utils/avatar';

const API_URL = API_BASE_URL;
const REQUEST_TIMEOUT_MS = 12000;

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

export interface UseUserReturn {
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

  const fetchWithTimeout = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  const getErrorMessage = useCallback(async (response: Response, fallback: string) => {
    try {
      const payload = await response.json();
      if (Array.isArray(payload?.message)) {
        return payload.message.join(', ');
      }
      return payload?.message || fallback;
    } catch {
      return fallback;
    }
  }, []);

  const redirectToLogin = useCallback((message: string) => {
    localStorage.removeItem('token');
    setUser(null);
    setError(message);
    setLoading(false);
    router.replace('/login');
  }, [router]);

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
      localStorage.removeItem('token');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetchWithTimeout(`${API_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        redirectToLogin('Tu sesión expiró. Inicia sesión de nuevo.');
        return;
      }

      if (!res.ok) {
        const message = await getErrorMessage(res, 'Error al obtener usuario');
        setError(message);
        setUser(null);
        return;
      }

      const userData = await res.json();
      const userId = userData.id || tokenData.id;

      userData.name = normalizeDisplayName(userData.name ?? tokenData?.name, tokenData?.name || 'Usuario');

      userData.profileImage = resolveProfileImage(
        userData.profileImage,
        userData.email || userData.name || userId,
      );

      // Si el usuario previamente estableció contraseña, restaurar el flag aunque el backend no lo refleje
      if (!userData.hasPassword && localStorage.getItem(`riff_hp_${userId}`) === '1') {
        userData.hasPassword = true;
      }

      try {
        let smData: SocialMediaResponse = null;
        try {
          const smQueryRes = await fetchWithTimeout(`${API_URL}/social-media?userId=${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (smQueryRes.ok) {
            smData = await smQueryRes.json();
          } else {
            const smRes = await fetchWithTimeout(`${API_URL}/social-media/user/${userId}`, {
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
            const smRes = await fetchWithTimeout(`${API_URL}/social-media/user/${userId}`, {
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
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('La consulta del perfil tardó demasiado. Intenta de nuevo en unos segundos.');
      } else {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWithTimeout, getErrorMessage, redirectToLogin]);

  const updateUser = async (data: Partial<UserData>): Promise<boolean> => {
    const token = getToken();
    
    if (!token || !user) {
      setError('No hay sesión activa');
      return false;
    }

    try {
      setError(null);

      const res = await fetchWithTimeout(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (res.status === 401) {
        redirectToLogin('Tu sesión expiró. Inicia sesión de nuevo.');
        return false;
      }

      if (!res.ok) {
        const message = await getErrorMessage(res, 'Error al actualizar');
        setError(message);
        return false;
      }

      const updatedUser = await res.json();
      setUser(prev => ({
        ...(prev || {}),
        ...data,
        ...updatedUser,
        name: normalizeDisplayName(
          String(updatedUser?.name ?? data.name ?? prev?.name ?? ''),
          prev?.name || 'Usuario',
        ),
        email: String(updatedUser?.email ?? data.email ?? prev?.email ?? ''),
        biography: String(updatedUser?.biography ?? data.biography ?? prev?.biography ?? '') || null,
        profileImage: resolveProfileImage(
          String(updatedUser?.profileImage ?? data.profileImage ?? prev?.profileImage ?? ''),
          String(updatedUser?.email ?? data.email ?? prev?.email ?? updatedUser?.name ?? data.name ?? prev?.name ?? prev?.id ?? ''),
        ),
        // El role NUNCA debe cambiar como resultado de un PATCH de perfil.
        // El gateway envía role: USER por defecto, lo que puede contaminar la respuesta.
        role: prev?.role ?? updatedUser.role,
        // Preservar hasPassword y googleId que el PATCH puede no devolver correctamente
        googleId: prev?.googleId ?? updatedUser.googleId,
        hasPassword: prev?.hasPassword || updatedUser.hasPassword,
        socialMedia: prev?.socialMedia,
      } as UserData));
      // Usar 'profileChange' en vez de 'authChange' para que no se dispare un fetchUser completo
      window.dispatchEvent(new Event('profileChange'));
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('La actualización tardó demasiado. Intenta nuevamente.');
      } else {
        setError(err instanceof Error ? err.message : 'Error al actualizar');
      }
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

      const res = await fetchWithTimeout(`${API_URL}/users/${user.id}`, {
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
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('La eliminación tardó demasiado. Intenta nuevamente.');
      } else {
        setError(err instanceof Error ? err.message : 'Error al eliminar cuenta');
      }
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

      const res = await fetchWithTimeout(`${API_URL}/users/${user.id}/password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword: password }),
      });

      if (res.status === 401) {
        redirectToLogin('Tu sesión expiró. Inicia sesión de nuevo.');
        return false;
      }

      if (!res.ok) {
        const message = await getErrorMessage(res, 'Error al establecer contraseña');
        setError(message);
        return false;
      }

      // Persistir el flag para que sobreviva entre sesiones
      localStorage.setItem(`riff_hp_${user.id}`, '1');
      setUser(prev => prev ? { ...prev, hasPassword: true } : null);

      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('La operación tardó demasiado. Intenta nuevamente.');
      } else {
        setError(err instanceof Error ? err.message : 'Error al establecer contraseña');
      }
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

      const res = await fetchWithTimeout(`${API_URL}/social-media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await getErrorMessage(res, 'Error al agregar red social');
        setError(msg);
        return null;
      }

      const newSocialMedia = await res.json();

      setUser(prev => prev ? {
        ...prev,
        socialMedia: [...(prev.socialMedia || []), newSocialMedia]
      } : null);

      return newSocialMedia;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('La operación tardó demasiado. Intenta nuevamente.');
      } else {
        setError(err instanceof Error ? err.message : 'Error al agregar red social');
      }
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

      const res = await fetchWithTimeout(`${API_URL}/social-media/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const msg = await getErrorMessage(res, 'Error al actualizar red social');
        setError(msg);
        return false;
      }

      setUser(prev => prev ? {
        ...prev,
        socialMedia: prev.socialMedia?.map(sm => sm.id === id ? { ...sm, url } : sm)
      } : null);

      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('La operación tardó demasiado. Intenta nuevamente.');
      } else {
        setError(err instanceof Error ? err.message : 'Error al actualizar red social');
      }
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

      const res = await fetchWithTimeout(`${API_URL}/social-media/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const msg = await getErrorMessage(res, 'Error al eliminar red social');
        setError(msg);
        return false;
      }

      setUser(prev => prev ? {
        ...prev,
        socialMedia: prev.socialMedia?.filter(sm => sm.id !== id)
      } : null);

      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('La operación tardó demasiado. Intenta nuevamente.');
      } else {
        setError(err instanceof Error ? err.message : 'Error al eliminar red social');
      }
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
