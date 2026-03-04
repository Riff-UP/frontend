'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../config/api';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterError {
  message: string;
  field?: string;
}

export function useRegister() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<RegisterError | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Limpiar error cuando el usuario empieza a escribir
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError({ message: 'El nombre es requerido', field: 'name' });
      return false;
    }

    if (!formData.email.trim()) {
      setError({ message: 'El correo es requerido', field: 'email' });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError({ message: 'El correo no es válido', field: 'email' });
      return false;
    }

    if (formData.password.length < 6) {
      setError({ message: 'La contraseña debe tener al menos 6 caracteres', field: 'password' });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError({ message: 'Las contraseñas no coinciden', field: 'confirmPassword' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Crear usuario
      const registerRes = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'USER',
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        // Manejar errores del backend
        const errorMessage = registerData.message || 'Error al crear la cuenta';
        setError({ message: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage });
        return;
      }

      // Usuario creado, ahora hacer login automático
      const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const loginData = await loginRes.json();

      if (loginData.token) {
        localStorage.setItem('token', loginData.token);
        // Disparar evento para actualizar Header
        window.dispatchEvent(new Event('authChange'));
        router.push('/');
      } else {
        // Usuario creado pero error en login, redirigir a login
        router.push('/login?registered=true');
      }
    } catch {
      setError({ message: 'Error al conectar con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return {
    formData,
    error,
    loading,
    handleChange,
    handleSubmit,
    handleGoogleRegister,
  };
}
