"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiMail } from "react-icons/fi";

interface VerifyCodeProps {
  email: string;
}

export default function VerifyCode({ email }: VerifyCodeProps) {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    // Solo acepta un dígito numérico
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError("");

    // Avanzar al siguiente campo automáticamente
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    pasted.split("").forEach((char, i) => {
      newCode[i] = char;
    });
    setCode(newCode);
    const nextEmpty = newCode.findIndex((c) => !c);
    inputs.current[nextEmpty !== -1 ? nextEmpty : 5]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setError("Ingresa el código completo de 6 dígitos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // TODO: Implementar verificación del código con la API
      console.log("Verificar código:", fullCode, "para:", email);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // En producción, la API devuelve un token para restablecer la contraseña
      router.push(`/reset-password?token=demo-token&email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError("El código es incorrecto o ha expirado. Intenta de nuevo.");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setError("");

    try {
      // TODO: Implementar reenvío del código con la API
      console.log("Reenviar código a:", email);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setResendCooldown(60);
    } catch (err) {
      setError("No se pudo reenviar el código. Intenta de nuevo.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-riff-primary-dark to-riff-primary flex items-center justify-center">
            <FiMail className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-riff-primary-dark to-riff-primary bg-clip-text text-transparent text-center">
          Verifica tu correo
        </h1>
        <p className="text-riff-text-secondary text-sm text-center">
          Ingresa el código de 6 dígitos que enviamos a
        </p>
        <p className="text-riff-login font-semibold text-sm text-center truncate">{email}</p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Inputs del código */}
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold border-1 rounded-lg
                         transition-all duration-200 text-riff-text-primary
                         focus:outline-none focus:border-riff-primary focus:ring-2 focus:ring-riff-primary/30
                         ${digit ? "border-riff-primary bg-riff-primary/5" : "border-riff-login"}`}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || code.join("").length < 6}
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
              Verificando...
            </span>
          ) : (
            "Verificar código"
          )}
        </button>
      </form>

      {/* Reenviar código */}
      <div className="text-center text-sm text-riff-text-secondary">
        ¿No recibiste el código?{" "}
        <button
          onClick={handleResend}
          disabled={resending || resendCooldown > 0}
          className="font-bold text-riff-registro hover:text-riff-primary-dark transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resending
            ? "Enviando..."
            : resendCooldown > 0
            ? `Reenviar en ${resendCooldown}s`
            : "Reenviar código"}
        </button>
      </div>

      {/* Volver */}
      <p className="text-center text-riff-text-secondary text-sm">
        <Link
          href="/forgot-password"
          className="flex items-center justify-center gap-1.5 text-riff-registro font-bold hover:text-riff-primary-dark transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Cambiar correo
        </Link>
      </p>
    </div>
  );
}
