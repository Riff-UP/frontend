'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function useLogin() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Detectar errores de OAuth desde los parámetros de URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'google_auth_failed') {
      setError('Error al autenticarse con Google. Por favor, intenta de nuevo.');
    } else if (errorParam === 'storage_failed') {
      setError('Error al guardar la sesión. Por favor, verifica tu navegador.');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem('token', data.token);
        // Disparar evento para actualizar Header
        window.dispatchEvent(new Event('authChange'));
        router.push('/');
      } else {
        setError('Correo o contraseña incorrectos');
      }
    } catch {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // El backend debe redirigir de vuelta a http://localhost:3001/?token=JWT
    window.location.href = 'http://localhost:4000/api/auth/google';
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