"use client";

import { useState } from "react";
import Link from "next/link";
import { FiEye, FiEyeOff, FiArrowLeft, FiCheck } from "react-icons/fi";
import { API_BASE_URL } from "@/app/config/api";

interface ResetPasswordProps {
  token?: string;
}

export default function ResetPassword({ token }: ResetPasswordProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (!token) {
      setError("Token inválido. Por favor solicita un nuevo enlace.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/password-resets/reset`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: formData.password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message || "El enlace es inválido o ha expirado. Solicita uno nuevo.";
        setError(msg);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Ocurrió un error de red. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 6) return { label: "Débil", color: "bg-red-400", width: "w-1/4" };
    if (pwd.length < 8) return { label: "Regular", color: "bg-yellow-400", width: "w-2/4" };
    if (pwd.length < 12 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: "Buena", color: "bg-blue-400", width: "w-3/4" };
    return { label: "Muy fuerte", color: "bg-green-400", width: "w-full" };
  };

  const strength = passwordStrength(formData.password);

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-riff-primary-dark to-riff-primary bg-clip-text text-transparent">
            Enlace inválido
          </h1>
          <p className="text-riff-text-secondary text-sm">
            El enlace de recuperación es inválido o ha expirado.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="block w-full py-2.5
                    bg-gradient-to-r from-riff-primary-dark to-riff-primary
                    text-white font-semibold rounded-lg text-center
                    hover:from-riff-primary hover:to-riff-primary-dark transform hover:scale-[1.02]
                    transition-all duration-300 shadow-lg shadow-riff-primary/25"
        >
          Solicitar nuevo enlace
        </Link>
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-riff-registro font-bold hover:text-riff-primary-dark transition-colors text-sm"
        >
          <FiArrowLeft className="w-4 h-4" />
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-riff-primary-dark to-riff-primary flex items-center justify-center">
            <FiCheck className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-riff-primary-dark to-riff-primary bg-clip-text text-transparent">
            ¡Contraseña actualizada!
          </h1>
          <p className="text-riff-text-secondary text-sm">
            Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.
          </p>
        </div>

        <Link
          href="/login"
          className="block w-full py-2.5
                    bg-gradient-to-r from-riff-primary-dark to-riff-primary
                    text-white font-semibold rounded-lg text-center
                    hover:from-riff-primary hover:to-riff-primary-dark transform hover:scale-[1.02]
                    transition-all duration-300 shadow-lg shadow-riff-primary/25"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-riff-primary-dark to-riff-primary bg-clip-text text-transparent">
          Nueva contraseña
        </h1>
        <p className="text-riff-text-secondary text-sm">
          Elige una contraseña segura para tu cuenta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Nueva contraseña */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Nueva contraseña"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-5 py-2.5 border-1 border-riff-login rounded-lg pr-14
                         focus:outline-none focus:border-riff-primary
                         transition-all duration-300 text-riff-text-primary placeholder-riff-login/80"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 p-1 text-riff-login hover:text-riff-login/60 transition-colors"
            >
              {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
            </button>
          </div>

          {/* Indicador de fortaleza */}
          {strength && (
            <div className="space-y-1">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
              </div>
              <p className="text-xs text-riff-text-secondary text-right">{strength.label}</p>
            </div>
          )}
        </div>

        {/* Confirmar contraseña */}
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirmar contraseña"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-5 py-2.5 border-1 border-riff-login rounded-lg pr-14
                       focus:outline-none focus:border-riff-primary
                       transition-all duration-300 text-riff-text-primary placeholder-riff-login/80"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-5 top-1/2 -translate-y-1/2 p-1 text-riff-login hover:text-riff-login/60 transition-colors"
          >
            {showConfirm ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5
                    bg-gradient-to-r from-riff-primary-dark to-riff-primary
                    text-white font-semibold rounded-lg
                    hover:from-riff-primary hover:to-riff-primary-dark transform hover:scale-[1.02]
                    transition-all duration-300 shadow-lg shadow-riff-primary/25
                    focus:outline-none focus:ring-4 focus:ring-riff-primary/30
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Guardando...
            </span>
          ) : (
            "Restablecer contraseña"
          )}
        </button>
      </form>

      <p className="text-center text-riff-text-secondary text-sm pt-2">
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-riff-registro font-bold hover:text-riff-primary-dark transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
