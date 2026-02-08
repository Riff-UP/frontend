"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }
    console.log("Register:", formData);
  };

  const handleGoogleRegister = () => {
    console.log("Google register");
  };

  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const EyeSlashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-riff-primary-dark to-riff-primary bg-clip-text text-transparent">
          ¡Regístrate!
        </h1>
        <p className="text-riff-login text-2xsm">Por favor, ingresa la siguiente información</p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
            {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
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
            {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </div>

        {/* Botón Registrarse */}
        <button
          type="submit"
          className="w-full py-2.5
                    bg-gradient-to-r from-riff-primary-dark to-riff-primary
                    text-white font-semibold rounded-lg 
                    hover:from-riff-primary hover:to-riff-primary-dark transform hover:scale-[1.02]
                     transition-all duration-300 shadow-lg shadow-riff-primary/25
                     focus:outline-none focus:ring-4 focus:ring-riff-primary/30"
        >
          Registrarse
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
        className="w-full py-2.5 bg-white border-1 rounded-lg 
                   flex items-center justify-center gap-3 
                   hover:border-riff-primary 
                    hover:shadow-md
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
