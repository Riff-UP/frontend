'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiShield, FiTrash2 } from 'react-icons/fi';
import type { UseUserReturn } from '../hooks/useUser';
import DeleteConfirmModal from './common/DeleteConfirmModal';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

interface SettingsProps {
  userState: UseUserReturn;
}

interface TwoFactorStatusResponse {
  enabled?: boolean;
  isEnabled?: boolean;
  twoFactorEnabled?: boolean;
  data?: {
    enabled?: boolean;
    isEnabled?: boolean;
    twoFactorEnabled?: boolean;
  };
}

interface TwoFactorSetupResponse {
  qrCodeUrl?: string;
  qrUrl?: string;
  otpauthUrl?: string;
  secret?: string;
  data?: {
    qrCodeUrl?: string;
    qrUrl?: string;
    otpauthUrl?: string;
    secret?: string;
  };
}

export default function Settings({ userState }: SettingsProps) {
  const { user, error, deleteAccount, setPassword } = userState;
  const hasPassword = !!user?.hasPassword;
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);
  const [setupQrUrl, setSetupQrUrl] = useState<string | null>(null);
  const [setupOtpAuthUrl, setSetupOtpAuthUrl] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const passwordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 6) return { label: 'Debil', color: 'bg-red-400', width: 'w-1/4' };
    if (pwd.length < 8) return { label: 'Regular', color: 'bg-yellow-400', width: 'w-2/4' };
    if (pwd.length < 12 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: 'Buena', color: 'bg-blue-400', width: 'w-3/4' };
    return { label: 'Muy fuerte', color: 'bg-green-400', width: 'w-full' };
  };

  const strength = passwordStrength(newPassword);

  useEffect(() => {
    if (error) {
      setDeleteMessage({ type: 'error', text: error });
    }
  }, [error]);

  const readErrorMessage = async (response: Response, fallback: string) => {
    try {
      const payload = await response.json();
      if (Array.isArray(payload?.message)) {
        return payload.message.join(', ');
      }
      return payload?.message || fallback;
    } catch {
      return fallback;
    }
  };

  const readTwoFactorEnabled = (payload: TwoFactorStatusResponse): boolean => {
    const root = payload || {};
    const nested = root.data || {};
    return Boolean(
      root.enabled ?? root.isEnabled ?? root.twoFactorEnabled ??
      nested.enabled ?? nested.isEnabled ?? nested.twoFactorEnabled
    );
  };

  const loadTwoFactorStatus = useCallback(async () => {
    setTwoFactorLoading(true);
    setTwoFactorError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/2fa/status`, {
        method: 'GET',
        headers: getAuthHeaders(true),
      });

      if (!res.ok) {
        setTwoFactorError(await readErrorMessage(res, 'No se pudo consultar el estado de 2FA.'));
        setTwoFactorEnabled(null);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as TwoFactorStatusResponse;
      setTwoFactorEnabled(readTwoFactorEnabled(data));
    } catch {
      setTwoFactorEnabled(null);
      setTwoFactorError('Error de red al consultar 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadTwoFactorStatus();
  }, [user, loadTwoFactorStatus]);

  const handleStartTwoFactorSetup = async () => {
    setTwoFactorBusy(true);
    setTwoFactorError(null);
    setTwoFactorSuccess(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/2fa/setup`, {
        method: 'POST',
        headers: getAuthHeaders(true),
      });

      if (!res.ok) {
        setTwoFactorError(await readErrorMessage(res, 'No se pudo iniciar la configuración de 2FA.'));
        return;
      }

      const payload = (await res.json().catch(() => ({}))) as TwoFactorSetupResponse;
      const source = payload.data || payload;

      setSetupQrUrl(source.qrCodeUrl || source.qrUrl || null);
      setSetupOtpAuthUrl(source.otpauthUrl || null);
      setSetupSecret(source.secret || null);
      setTwoFactorSuccess('Escanea el QR y confirma con el código de 6 dígitos.');
    } catch {
      setTwoFactorError('Error de red al iniciar la configuración de 2FA.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    setTwoFactorError(null);
    setTwoFactorSuccess(null);

    if (!/^\d{6}$/.test(enableCode)) {
      setTwoFactorError('Ingresa un código válido de 6 dígitos para activar 2FA.');
      return;
    }

    setTwoFactorBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/2fa/enable`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ code: enableCode }),
      });

      if (!res.ok) {
        setTwoFactorError(await readErrorMessage(res, 'No se pudo activar 2FA.'));
        return;
      }

      setEnableCode('');
      setSetupQrUrl(null);
      setSetupOtpAuthUrl(null);
      setSetupSecret(null);
      setTwoFactorEnabled(true);
      setTwoFactorSuccess('Autenticación en dos pasos activada correctamente.');
      await loadTwoFactorStatus();
    } catch {
      setTwoFactorError('Error de red al activar 2FA.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    setTwoFactorError(null);
    setTwoFactorSuccess(null);

    if (disableCode && !/^\d{6}$/.test(disableCode)) {
      setTwoFactorError('Si ingresas código para desactivar, debe ser de 6 dígitos.');
      return;
    }

    setTwoFactorBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(disableCode ? { code: disableCode } : {}),
      });

      if (!res.ok) {
        setTwoFactorError(await readErrorMessage(res, 'No se pudo desactivar 2FA.'));
        return;
      }

      setDisableCode('');
      setTwoFactorEnabled(false);
      setTwoFactorSuccess('Autenticación en dos pasos desactivada correctamente.');
      await loadTwoFactorStatus();
    } catch {
      setTwoFactorError('Error de red al desactivar 2FA.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteMessage(null);
    setDeletingAccount(true);
    try {
      const deleted = await deleteAccount();
      if (deleted) {
        setDeleteMessage({ type: 'success', text: 'Cuenta eliminada correctamente.' });
        setShowDeleteModal(false);
      } else {
        setDeleteMessage({ type: 'error', text: 'No se pudo eliminar la cuenta. Intenta nuevamente.' });
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleSetPassword = async () => {
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setSavingPassword(true);
    try {
      const success = await setPassword(newPassword);

      if (success) {
        setPasswordMessage({
          type: 'success',
          text: hasPassword
            ? 'Contraseña actualizada correctamente.'
            : 'Contraseña establecida. Ahora puedes iniciar sesión con email y contraseña.',
        });
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
        return;
      }

      setPasswordMessage({
        type: 'error',
        text: error || (hasPassword ? 'Error al actualizar contraseña.' : 'Error al establecer contraseña.'),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="w-full rounded-sm border border-white/10 bg-riff-header p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h2 className="text-white text-xl sm:text-2xl font-bold">Configuracion</h2>
          <p className="text-white/70 text-sm mt-1">Ajusta preferencias de tu cuenta.</p>
        </div>
      </div>

      <div className="space-y-6">
        {user && (
          <div className="rounded-sm border border-white/10 bg-riff-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <FiLock className="w-4 h-4 text-riff-primary" />
              <h3 className="text-white font-semibold">Contraseña</h3>
            </div>

            <p className="text-white/70 text-xs sm:text-sm mt-1 mb-4">
              {hasPassword
                ? 'Cambia tu contraseña para mantener tu cuenta segura.'
                : 'Establece una contraseña para también iniciar sesión con email y contraseña.'}
            </p>

            {passwordMessage && (
              <div className={`mb-3 p-3 rounded-sm text-sm ${
                passwordMessage.type === 'success'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {passwordMessage.text}
              </div>
            )}

            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="inline-flex items-center gap-2 rounded-sm border border-white/20 bg-riff-text-primary/40 px-4 py-2 text-sm font-medium text-white hover:bg-riff-text-primary/60 transition-colors"
              >
                <FiLock className="w-4 h-4" />
                {hasPassword ? 'Cambiar contraseña' : 'Establecer contraseña'}
              </button>
            ) : (
              <div className="max-w-sm space-y-3">
                <div>
                  <label className="block text-white text-xs sm:text-sm mb-1">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2 pr-10 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                    >
                      {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>

                  {strength && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                      </div>
                      <p className="text-xs text-riff-text-secondary text-right">{strength.label}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-white text-xs sm:text-sm mb-1">Confirmar contraseña</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full px-3 py-2 pr-10 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSetPassword}
                    disabled={savingPassword}
                    className="px-4 py-2 bg-gradient-to-r from-riff-save to-riff-save-2 hover:from-riff-save-2 hover:to-riff-save text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-50"
                  >
                    {savingPassword ? 'Guardando...' : (hasPassword ? 'Actualizar contraseña' : 'Guardar contraseña')}
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordForm(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setShowPassword(false);
                      setShowConfirmPassword(false);
                      setPasswordMessage(null);
                    }}
                    className="px-4 py-2 border border-white/20 text-white/80 hover:text-white hover:bg-white/5 text-sm rounded-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-sm border border-white/10 bg-riff-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <FiShield className="w-4 h-4 text-riff-primary" />
            <h3 className="text-white font-semibold">Autenticación en dos pasos (2FA)</h3>
          </div>

          <p className="text-white/70 text-xs sm:text-sm mt-1 mb-4">
            Protege tu cuenta con códigos temporales desde Google Authenticator.
          </p>

          {twoFactorLoading ? (
            <p className="text-riff-text-secondary text-sm">Cargando estado de 2FA...</p>
          ) : (
            <p className="text-sm mb-4">
              <span className="text-white/80">Estado actual: </span>
              <span className={twoFactorEnabled ? 'text-green-400 font-semibold' : 'text-yellow-300 font-semibold'}>
                {twoFactorEnabled ? 'Activado' : 'Desactivado'}
              </span>
            </p>
          )}

          {twoFactorError && (
            <div className="mb-3 p-3 rounded-sm text-sm bg-red-500/20 text-red-400 border border-red-500/30">
              {twoFactorError}
            </div>
          )}

          {twoFactorSuccess && (
            <div className="mb-3 p-3 rounded-sm text-sm bg-green-500/20 text-green-400 border border-green-500/30">
              {twoFactorSuccess}
            </div>
          )}

          {!twoFactorEnabled && !setupQrUrl && (
            <button
              onClick={handleStartTwoFactorSetup}
              disabled={twoFactorBusy || twoFactorLoading}
              className="inline-flex items-center gap-2 rounded-sm border border-white/20 bg-riff-text-primary/40 px-4 py-2 text-sm font-medium text-white hover:bg-riff-text-primary/60 transition-colors disabled:opacity-50"
            >
              <FiShield className="w-4 h-4" />
              {twoFactorBusy ? 'Preparando...' : 'Activar 2FA'}
            </button>
          )}

          {!twoFactorEnabled && setupQrUrl && (
            <div className="space-y-3">
              <div className="bg-white rounded-sm p-3 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setupQrUrl} alt="QR de configuración 2FA" className="w-40 h-40 object-contain" />
              </div>

              {setupSecret && (
                <p className="text-xs text-white/70 break-all">
                  Clave manual: <span className="text-white">{setupSecret}</span>
                </p>
              )}

              {setupOtpAuthUrl && (
                <p className="text-xs text-white/60 break-all">URI OTP: {setupOtpAuthUrl}</p>
              )}

              <div className="max-w-sm">
                <label className="block text-white text-xs sm:text-sm mb-1">Código de verificación</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={enableCode}
                  onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-3 py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary transition-all duration-200"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleEnableTwoFactor}
                  disabled={twoFactorBusy || enableCode.length !== 6}
                  className="px-4 py-2 bg-gradient-to-r from-riff-save to-riff-save-2 hover:from-riff-save-2 hover:to-riff-save text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-50"
                >
                  {twoFactorBusy ? 'Activando...' : 'Confirmar activación'}
                </button>
                <button
                  onClick={() => {
                    setSetupQrUrl(null);
                    setSetupOtpAuthUrl(null);
                    setSetupSecret(null);
                    setEnableCode('');
                    setTwoFactorError(null);
                    setTwoFactorSuccess(null);
                  }}
                  className="px-4 py-2 border border-white/20 text-white/80 hover:text-white hover:bg-white/5 text-sm rounded-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {twoFactorEnabled && (
            <div className="space-y-3 max-w-sm">
              <label className="block text-white text-xs sm:text-sm mb-1">Código actual (si aplica para desactivar)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Opcional"
                className="w-full px-3 py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary transition-all duration-200"
              />

              <button
                onClick={handleDisableTwoFactor}
                disabled={twoFactorBusy || twoFactorLoading}
                className="inline-flex items-center gap-2 rounded-sm border border-red-400/40 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {twoFactorBusy ? 'Desactivando...' : 'Desactivar 2FA'}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-sm border border-red-400/30 bg-red-500/5 p-4 sm:p-5">
          <h3 className="text-red-300 font-semibold">Zona de peligro</h3>
          <p className="text-white/75 text-xs sm:text-sm mt-1 mb-4">
            Eliminar tu cuenta borrara de forma permanente tu perfil y datos relacionados.
          </p>
          {deleteMessage && (
            <div className={`mb-4 p-3 rounded-sm text-sm ${
              deleteMessage.type === 'success'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {deleteMessage.text}
            </div>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 rounded-sm border border-red-400/40 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <FiTrash2 className="w-4 h-4" />
            Eliminar cuenta
          </button>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title="Eliminar cuenta"
        message="Esta accion no se puede deshacer. Se eliminara tu cuenta permanentemente."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={deletingAccount}
      />
    </div>
  );
}
