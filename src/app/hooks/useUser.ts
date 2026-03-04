'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getValidToken, getUserFromToken } from '../utils/jwt';

export interface SocialMedia {
  id: string;
  url: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  googleId?: string | null;
  hasPassword?: boolean;
  biography?: string | null;
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

const API_URL = 'http://localhost:4000/api';

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
      setLoading(false);
      setError('No hay sesión activa');
      return;
    }

    // Obtener el ID del usuario desde el token
    const tokenData = getUserFromToken(token);
    if (!tokenData || !tokenData.id) {
      setLoading(false);
      setError('Token inválido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/users/${tokenData.id}`, {
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
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al obtener usuario');
      }

      const userData = await res.json();
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

      const res = await fetch(`${API_URL}/users/${user.id}`, {
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
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al actualizar');
      }

      const updatedUser = await res.json();
      setUser(updatedUser);
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
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al eliminar cuenta');
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
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al establecer contraseña');
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

      const res = await fetch(`${API_URL}/social-media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id, url }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al agregar red social');
      }

      const newSocialMedia = await res.json();
      
      // Actualizar usuario local
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

      const res = await fetch(`${API_URL}/social-media/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al actualizar red social');
      }

      // Actualizar usuario local
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

      const res = await fetch(`${API_URL}/social-media/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al eliminar red social');
      }

      // Actualizar usuario local
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
