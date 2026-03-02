'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface UserData {
  id: string;
  name: string;
  email: string;
  googleId?: string | null;
  biography?: string | null;
  role: 'USER' | 'ARTIST';
  status: boolean;
  createdAt: string;
}

interface UseUserReturn {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  updateUser: (data: Partial<UserData>) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
}

const API_URL = 'http://localhost:4000/api';

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const fetchUser = useCallback(async () => {
    const token = getToken();
    
    if (!token) {
      setLoading(false);
      setError('No hay sesión activa');
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
  };
}
