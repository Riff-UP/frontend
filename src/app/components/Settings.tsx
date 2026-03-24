'use client';

import { useEffect, useState } from 'react';
import { FiMoon, FiSettings, FiSun, FiTrash2 } from 'react-icons/fi';
import type { UseUserReturn } from '../hooks/useUser';
import DeleteConfirmModal from './common/DeleteConfirmModal';

interface SettingsProps {
  userState: UseUserReturn;
}

type ThemeMode = 'dark' | 'light';

export default function Settings({ userState }: SettingsProps) {
  const { deleteAccount } = userState;
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const attrTheme = document.documentElement.getAttribute('data-theme');
    const savedTheme = localStorage.getItem('riff-theme');
    const initialTheme: ThemeMode = (savedTheme === 'light' || savedTheme === 'dark')
      ? savedTheme
      : (attrTheme === 'light' ? 'light' : 'dark');

    setTheme(initialTheme);
  }, []);

  const applyTheme = (nextTheme: ThemeMode) => {
    if (typeof window === 'undefined') return;
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('riff-theme', nextTheme);
    setTheme(nextTheme);
  };

  const handleThemeToggle = () => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleConfirmDelete = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      setShowDeleteModal(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="w-full rounded-sm border border-white/10 bg-riff-header p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <FiSettings className="w-6 h-6 text-riff-primary" />
        <div>
          <h2 className="text-white text-xl sm:text-2xl font-bold">Configuracion</h2>
          <p className="text-white/70 text-sm mt-1">Ajusta preferencias de la cuenta y apariencia.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-sm border border-white/10 bg-riff-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold">Tema claro</h3>
              <p className="text-white/70 text-xs sm:text-sm mt-1">
                Cambia entre modo oscuro y claro para toda la aplicacion.
              </p>
            </div>

            <button
              onClick={handleThemeToggle}
              className={`relative inline-flex h-9 w-20 items-center rounded-full border transition-colors ${
                theme === 'light'
                  ? 'border-riff-primary/60 bg-riff-primary/20'
                  : 'border-white/20 bg-black/20'
              }`}
              aria-label="Cambiar tema"
            >
              <span
                className={`absolute left-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-riff-primary shadow transition-transform ${
                  theme === 'light' ? 'translate-x-11' : 'translate-x-0'
                }`}
              >
                {theme === 'light' ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
              </span>
            </button>
          </div>
        </div>

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
