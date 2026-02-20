"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useLogin } from "@/app/hooks/useLogin";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { formData, error, loading, handleChange, handleSubmit, handleGoogleLogin } = useLogin();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-riff-primary-dark to-riff-primary bg-clip-text text-transparent">
          ¡Inicia sesión!
        </h1>
        <p className="text-riff-login text-2xsm">Por favor, ingresa tus datos</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="group">
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

        <div className="relative group">
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

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-riff-text-secondary hover:text-riff-primary transition-colors font-medium"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5
                    bg-gradient-to-r from-riff-primary-dark to-riff-primary
                    text-white font-semibold rounded-lg 
                    hover:from-riff-primary hover:to-riff-primary-dark transform hover:scale-[1.02]
                    transition-all duration-300 shadow-lg shadow-riff-primary/25
                    focus:outline-none focus:ring-4 focus:ring-riff-primary/30
                    disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-riff-primary-dark to-riff-primary"></div>
        <span className="text-riff-primary text-sm font-medium px-2">O</span>
        <div className="flex-1 h-px bg-gradient-to-r from-riff-primary to-riff-primary-dark"></div>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="w-full py-2.5 bg-white border-1 rounded-lg 
                   flex items-center justify-center gap-3 
                   hover:border-riff-primary hover:shadow-md
                   transition-all duration-300 group"
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

      <p className="text-center text-riff-text-secondary pt-4">
        ¿No tienes una cuenta?{" "}
        <Link
          href="/register"
          className="text-riff-registro font-bold hover:text-riff-primary-dark transition-colors"
        >
          Regístrate
        </Link>
      </p>
    </div>
  );
}