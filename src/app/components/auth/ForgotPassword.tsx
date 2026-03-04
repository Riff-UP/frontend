"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // TODO: Implementar llamada a la API para enviar código de recuperación
      console.log("Recuperar contraseña para:", email);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simular petición
      router.push(`/verify-code?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError("Ocurrió un error. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-riff-primary-dark to-riff-primary bg-clip-text text-transparent">
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="text-riff-text-secondary text-sm">
          Ingresa tu correo y te enviaremos un código para restablecerla.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-5 py-2.5 border-1 border-riff-login rounded-lg
                     focus:outline-none focus:border-riff-primary
                     transition-all duration-300 text-riff-text-primary placeholder-riff-login/80"
          required
        />

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
              Enviando...
            </span>
          ) : (
            "Enviar Código  "
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
