'use client';

import { useState } from 'react';
import { FiLock, FiTrash2 } from 'react-icons/fi';
import type { UseUserReturn } from '../hooks/useUser';
import DeleteConfirmModal from './common/DeleteConfirmModal';

interface SettingsProps {
  userState: UseUserReturn;
}

export default function Settings({ userState }: SettingsProps) {
  const { user, error, deleteAccount, setPassword } = userState;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConfirmDelete = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      setShowDeleteModal(false);
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
          text: 'Contraseña establecida. Ahora puedes iniciar sesión con email y contraseña.',
        });
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
        return;
      }

      setPasswordMessage({ type: 'error', text: error || 'Error al establecer contraseña.' });
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
        {user?.googleId && !user?.hasPassword && (
          <div className="rounded-sm border border-white/10 bg-riff-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <FiLock className="w-4 h-4 text-riff-primary" />
              <h3 className="text-white font-semibold">Cuenta de Google</h3>
            </div>

            <p className="text-white/70 text-xs sm:text-sm mt-1 mb-4">
              Tu cuenta está vinculada con Google. Puedes establecer una contraseña para también iniciar sesión con email y contraseña.
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
                Establecer contraseña
              </button>
            ) : (
              <div className="max-w-sm space-y-3">
                <div>
                  <label className="block text-white text-xs sm:text-sm mb-1">Nueva contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-white text-xs sm:text-sm mb-1">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full px-3 py-2 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white text-sm placeholder-riff-text-secondary focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary transition-all duration-200"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSetPassword}
                    disabled={savingPassword}
                    className="px-4 py-2 bg-gradient-to-r from-riff-save to-riff-save-2 hover:from-riff-save-2 hover:to-riff-save text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-50"
                  >
                    {savingPassword ? 'Guardando...' : 'Guardar contraseña'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordForm(false);
                      setNewPassword('');
                      setConfirmPassword('');
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

        <div className="rounded-sm border border-red-400/30 bg-red-500/5 p-4 sm:p-5">
          <h3 className="text-red-300 font-semibold">Zona de peligro</h3>
          <p className="text-white/75 text-xs sm:text-sm mt-1 mb-4">
            Eliminar tu cuenta borrara de forma permanente tu perfil y datos relacionados.
          </p>
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
      />
    </div>
  );
}
