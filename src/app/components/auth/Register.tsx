"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useRegister } from "../../hooks/useRegister";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  
  const {
    formData,
    error,
    loading,
    handleChange,
    handleSubmit,
    handleGoogleRegister,
  } = useRegister();

  const passwordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 6) return { label: "Débil", color: "bg-red-400", width: "w-1/4" };
    if (pwd.length < 8) return { label: "Regular", color: "bg-yellow-400", width: "w-2/4" };
    if (pwd.length < 12 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: "Buena", color: "bg-blue-400", width: "w-3/4" };
    return { label: "Muy fuerte", color: "bg-green-400", width: "w-full" };
  };

  const strength = passwordStrength(formData.password);

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-riff-primary-dark to-riff-primary bg-clip-text text-transparent">
          ¡Regístrate!
        </h1>
        <p className="text-riff-login text-2xsm">Por favor, ingresa la siguiente información</p>
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sky-800 text-xs leading-relaxed">
          La autenticación en dos pasos no se activa automáticamente al registrarte.
          Debes activarla dentro de tu cuenta y, a partir de ese momento, se solicitará en cada login.
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mensaje de error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error.message}
          </div>
        )}

        {/* Campo Nombre */}
        <div>
          <input
            type="text"
            name="name"
            placeholder="Nombre"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-5 py-2.5 border-1 border-riff-login rounded-lg 
                       focus:outline-none focus:border-riff-primary
                       transition-all duration-300 text-riff-text-primary placeholder-riff-login/80"
            required
          />
        </div>

        {/* Campo Correo */}
        <div>
          <input
            type="email"
            name="email"
            placeholder="Correo"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-5 py-2.5 border-1 border-riff-login rounded-lg 
                       focus:outline-none focus:border-riff-primary
                       transition-all duration-300 text-riff-text-primary placeholder-riff-login/80"
            required
          />
        </div>

        {/* Campo Contraseña */}
        <div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-5 py-2.5 border-1 border-riff-login rounded-lg 
                         focus:outline-none focus:border-riff-primary
                         transition-all duration-300 text-riff-text-primary placeholder-riff-login/80 pr-14"
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
            <div className="mt-2 space-y-1">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
              </div>
              <p className="text-xs text-riff-text-secondary text-right">{strength.label}</p>
            </div>
          )}
        </div>

        {/* Campo Confirmar Contraseña */}
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirmar contraseña"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-5 py-2.5 border-1 border-riff-login rounded-lg 
                       focus:outline-none focus:border-riff-primary
                       transition-all duration-300 text-riff-text-primary placeholder-riff-login/80 pr-14"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-5 top-1/2 -translate-y-1/2 p-1 text-riff-login hover:text-riff-login/60 transition-colors"
          >
            {showConfirmPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
          </button>
        </div>

        {/* Botón Registrarse */}
        <button
          type="submit"
          disabled={loading || !acceptedPrivacy}
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
              Registrando...
            </span>
          ) : (
            'Registrarse'
          )}
        </button>
      </form>

      {/* Separador */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-riff-primary-dark to-riff-primary"></div>
        <span className="text-riff-primary text-sm font-medium px-2">O</span>
        <div className="flex-1 h-px bg-gradient-to-r from-riff-primary to-riff-primary-dark"></div>
      </div>

      {/* Botón Google */}
      <button
        onClick={handleGoogleRegister}
        disabled={loading || !acceptedPrivacy}
        className="w-full py-2.5 bg-white border-1 rounded-lg 
                   flex items-center justify-center gap-3 
                   hover:border-riff-primary 
                    hover:shadow-md
                   transition-all duration-300 group
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Image
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
          width={22}
          height={22}
        />
        <span className="text-riff-login font-medium group-hover:text-riff-primary transition-colors">
          Continuar con Google
        </span>
      </button>

      <label className="flex items-center justify-center gap-3 text-xs sm:text-sm text-riff-text-secondary text-center">
        <input
          type="checkbox"
          checked={acceptedPrivacy}
          onChange={(e) => setAcceptedPrivacy(e.target.checked)}
          className="h-4 w-4 rounded border border-riff-login accent-riff-primary"
        />
        <span>
          He leído y acepto la{' '}
          <Link href="/privacy" className="text-riff-primary-dark/80 hover:text-riff-primary-dark underline underline-offset-2">
            Política de Privacidad
          </Link>
          .
        </span>
      </label>

      {/* Link a login */}
      <p className="text-center text-riff-text-secondary pt-4">
        ¿Ya tienes una cuenta?{" "}
        <Link 
          href="/login" 
          className="text-riff-registro font-bold hover:text-riff-primary-dark transition-colors"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
