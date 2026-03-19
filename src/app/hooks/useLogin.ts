'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../config/api';
import { getValidToken, decodeJWT } from '../utils/jwt';

const REQUEST_TIMEOUT_MS = 12000;

function normalizeLoginErrorMessage(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes('invalid credentials') ||
    normalized.includes('invalid credential') ||
    normalized.includes('credenciales invalidas') ||
    normalized.includes('credenciales inválidas') ||
    normalized.includes('unauthorized') ||
    normalized.includes('invalid login')
  ) {
    return 'Los datos ingresados no son válidos. Revisa tu correo y contraseña.';
  }

  if (normalized.includes('user not found') || normalized.includes('usuario no encontrado')) {
    return 'No encontramos una cuenta con ese correo.';
  }

  return message;
}

function normalizeOAuthErrorMessage(errorCode: string): string {
  const normalized = errorCode.trim().toLowerCase();

  if (normalized === 'google_auth_failed') {
    return 'Error al autenticarse con Google. Por favor, intenta de nuevo.';
  }

  if (normalized === 'storage_failed') {
    return 'Error al guardar la sesión. Por favor, verifica tu navegador.';
  }

  if (normalized === 'oauth_user_lookup') {
    return 'No se pudo validar tu cuenta con Google contra la base de usuarios.';
  }

  if (
    normalized === 'oauth_user_create' ||
    normalized === 'oauth_user_create_failed' ||
    normalized === 'oauth_register_failed'
  ) {
    return 'La autenticación con Google llegó al callback, pero falló la creación de tu cuenta.';
  }

  if (normalized) {
    return `No se pudo completar el acceso con Google (código: ${normalized}).`;
  }

  return 'No se pudo completar el acceso con Google.';
}

export function useLogin() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchWithTimeout = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        return await fetch(input, { ...init, signal: controller.signal });
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    []
  );

  const readResponseBody = useCallback(
    async (response: Response) => {
      const raw = await response.text();
      if (!raw) return {};

      try {
        return JSON.parse(raw) as { token?: string; message?: string | string[] };
      } catch {
        return { message: raw };
      }
    },
    []
  );

  // Detectar errores de OAuth desde los parámetros de URL
  useEffect(() => {
    const tokenFromUrl =
      searchParams.get('token') ||
      searchParams.get('access_token') ||
      searchParams.get('jwt');

    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      window.dispatchEvent(new Event('authChange'));
      router.replace('/profile');
      return;
    }

    const token = getValidToken();
    if (token) {
      router.replace('/profile');
      return;
    }

    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(normalizeOAuthErrorMessage(errorParam));
    }
  }, [router, searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await readResponseBody(res);

      if (!res.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(', ')
          : (data.message || 'Correo o contraseña incorrectos');
        setError(normalizeLoginErrorMessage(message));
        return;
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        // Si el usuario pudo iniciar sesión con email+contraseña, definitivamente tiene contraseña.
        // Guardar el flag para que el formulario de "establecer contraseña" no reaparezca.
        const payload = decodeJWT<{ id?: string }>(data.token);
        if (payload?.id) {
          localStorage.setItem(`riff_hp_${payload.id}`, '1');
        }
        // Disparar evento para actualizar Header
        window.dispatchEvent(new Event('authChange'));
        router.replace('/profile');
      } else {
        setError('La respuesta del servidor no incluyó un token válido.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('El inicio de sesión tardó demasiado. Intenta de nuevo.');
      } else {
        setError('Error al conectar con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // El backend debe redirigir de vuelta a http://localhost:3001/?token=JWT
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return {
    formData,
    error,
    loading,
    handleChange,
    handleSubmit,
    handleGoogleLogin,
  };
}