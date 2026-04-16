'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../config/api';
import { getValidToken, decodeJWT } from '../utils/jwt';

const REQUEST_TIMEOUT_MS = 12000;
const TWO_FACTOR_TEMP_TOKEN_KEY = 'riff_2fa_temp_token';
const TWO_FACTOR_EXPIRES_AT_KEY = 'riff_2fa_expires_at';

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

function normalizeTwoFactorErrorMessage(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes('invalid code') ||
    normalized.includes('invalid totp') ||
    normalized.includes('codigo invalido') ||
    normalized.includes('código inválido') ||
    normalized.includes('code is invalid')
  ) {
    return 'El código de autenticación no es válido. Revisa tu app y vuelve a intentarlo.';
  }

  if (
    normalized.includes('expired') ||
    normalized.includes('token expired') ||
    normalized.includes('challenge expired')
  ) {
    return 'La verificación expiró. Inicia sesión de nuevo.';
  }

  if (
    normalized.includes('too many') ||
    normalized.includes('max attempts') ||
    normalized.includes('demasiados intentos')
  ) {
    return 'Se alcanzó el límite de intentos. Espera un momento y vuelve a iniciar sesión.';
  }

  return message;
}

interface LoginResponseBody {
  token?: string;
  message?: string | string[];
  requiresTwoFactor?: boolean;
  tempToken?: string;
  expiresInSeconds?: number;
}

function getFirstString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeLoginPayload(payload: unknown): LoginResponseBody {
  const root = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};
  const nested = [root.data, root.payload, root.result].find(
    (value): value is Record<string, unknown> => !!value && typeof value === 'object'
  ) || {};

  const token = getFirstString(
    root.token,
    root.accessToken,
    root.jwt,
    nested.token,
    nested.accessToken,
    nested.jwt
  );

  const tempToken = getFirstString(
    root.tempToken,
    root.temp_token,
    root.twoFactorTempToken,
    nested.tempToken,
    nested.temp_token,
    nested.twoFactorTempToken
  );

  const requiresTwoFactor = toBoolean(
    root.requiresTwoFactor ??
    root.requires2fa ??
    root.requires2FA ??
    root.twoFactorRequired ??
    nested.requiresTwoFactor ??
    nested.requires2fa ??
    nested.requires2FA ??
    nested.twoFactorRequired
  );

  const expiresInSeconds = toNumber(
    root.expiresInSeconds ??
    root.expires_in_seconds ??
    nested.expiresInSeconds ??
    nested.expires_in_seconds
  );

  const message = (root.message ?? nested.message) as string | string[] | undefined;

  return {
    token,
    tempToken,
    requiresTwoFactor,
    expiresInSeconds,
    message,
  };
}

export function useLogin() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [twoFactorExpiresAt, setTwoFactorExpiresAt] = useState<number | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
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
        return normalizeLoginPayload(JSON.parse(raw));
      } catch {
        return { message: raw };
      }
    },
    []
  );

  // Detectar errores de OAuth desde los parámetros de URL
  useEffect(() => {
    const storedTempToken = sessionStorage.getItem(TWO_FACTOR_TEMP_TOKEN_KEY);
    const storedExpiresAtRaw = sessionStorage.getItem(TWO_FACTOR_EXPIRES_AT_KEY);
    const storedExpiresAt = storedExpiresAtRaw ? Number(storedExpiresAtRaw) : null;

    if (storedTempToken) {
      const isExpired = storedExpiresAt !== null && Number.isFinite(storedExpiresAt) && Date.now() >= storedExpiresAt;
      if (isExpired) {
        sessionStorage.removeItem(TWO_FACTOR_TEMP_TOKEN_KEY);
        sessionStorage.removeItem(TWO_FACTOR_EXPIRES_AT_KEY);
      } else {
        setTempToken(storedTempToken);
        setTwoFactorExpiresAt(storedExpiresAt);
        setRequiresTwoFactor(true);
      }
    }

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

    const requiresTwoFactorParam =
      searchParams.get('requires2fa') ||
      searchParams.get('requiresTwoFactor') ||
      searchParams.get('requires2FA');
    const tempTokenFromUrl = searchParams.get('tempToken');
    const expiresInSecondsFromUrl = Number(searchParams.get('expiresInSeconds') || '0');

    const oauthRequires2fa = requiresTwoFactorParam?.toLowerCase() === 'true';
    const oauthDisables2fa = requiresTwoFactorParam?.toLowerCase() === 'false';
    if (tempTokenFromUrl && (oauthRequires2fa || !oauthDisables2fa)) {
      const expiresAt = Number.isFinite(expiresInSecondsFromUrl) && expiresInSecondsFromUrl > 0
        ? Date.now() + expiresInSecondsFromUrl * 1000
        : null;

      sessionStorage.setItem(TWO_FACTOR_TEMP_TOKEN_KEY, tempTokenFromUrl);
      if (expiresAt !== null) {
        sessionStorage.setItem(TWO_FACTOR_EXPIRES_AT_KEY, String(expiresAt));
      } else {
        sessionStorage.removeItem(TWO_FACTOR_EXPIRES_AT_KEY);
      }

      setTempToken(tempTokenFromUrl);
      setTwoFactorExpiresAt(expiresAt);
      setRequiresTwoFactor(true);
      router.replace('/login');
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

      const shouldRequireTwoFactor = Boolean(data.requiresTwoFactor || (data.tempToken && !data.token));
      if (shouldRequireTwoFactor && data.tempToken) {
        const expiresAt = Number.isFinite(data.expiresInSeconds) && (data.expiresInSeconds || 0) > 0
          ? Date.now() + (data.expiresInSeconds || 0) * 1000
          : null;

        sessionStorage.setItem(TWO_FACTOR_TEMP_TOKEN_KEY, data.tempToken);
        if (expiresAt !== null) {
          sessionStorage.setItem(TWO_FACTOR_EXPIRES_AT_KEY, String(expiresAt));
        } else {
          sessionStorage.removeItem(TWO_FACTOR_EXPIRES_AT_KEY);
        }

        setTempToken(data.tempToken);
        setTwoFactorExpiresAt(expiresAt);
        setRequiresTwoFactor(true);
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

  const handleVerifyTwoFactor = async (code: string) => {
    if (!tempToken) {
      setError('Tu sesión de verificación expiró. Inicia sesión nuevamente.');
      return false;
    }

    if (!/^\d{6}$/.test(code)) {
      setError('Ingresa un código de 6 dígitos.');
      return false;
    }

    setTwoFactorLoading(true);
    setError(null);

    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/2fa/verify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code }),
      });

      const data = await readResponseBody(res);

      if (!res.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(', ')
          : (data.message || 'No se pudo validar el código de autenticación.');
        setError(normalizeTwoFactorErrorMessage(message));
        return false;
      }

      if (!data.token) {
        setError('La verificación se completó, pero no se recibió un token de sesión.');
        return false;
      }

      localStorage.setItem('token', data.token);
      const payload = decodeJWT<{ id?: string }>(data.token);
      if (payload?.id) {
        localStorage.setItem(`riff_hp_${payload.id}`, '1');
      }

      sessionStorage.removeItem(TWO_FACTOR_TEMP_TOKEN_KEY);
      sessionStorage.removeItem(TWO_FACTOR_EXPIRES_AT_KEY);
      setTempToken(null);
      setTwoFactorExpiresAt(null);
      setRequiresTwoFactor(false);

      window.dispatchEvent(new Event('authChange'));
      router.replace('/profile');
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('La verificación tardó demasiado. Intenta de nuevo.');
      } else {
        setError('No se pudo conectar con el servidor para validar el código.');
      }
      return false;
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequiresTwoFactor(false);
    setTempToken(null);
    setTwoFactorExpiresAt(null);
    setError(null);
    sessionStorage.removeItem(TWO_FACTOR_TEMP_TOKEN_KEY);
    sessionStorage.removeItem(TWO_FACTOR_EXPIRES_AT_KEY);
  };

  return {
    formData,
    error,
    loading,
    requiresTwoFactor,
    twoFactorLoading,
    twoFactorExpiresAt,
    handleChange,
    handleSubmit,
    handleGoogleLogin,
    handleVerifyTwoFactor,
    handleBackToLogin,
  };
}