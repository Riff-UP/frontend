'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function useLogin() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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