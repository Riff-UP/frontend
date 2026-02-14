import { MdDelete } from 'react-icons/md';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-riff-card border border-white/20 rounded-lg w-full max-w-md shadow-2xl">
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-400/20 flex items-center justify-center mb-4">
              <MdDelete className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-white text-xl font-semibold mb-2">{title}</h3>
            <p className="text-riff-text-secondary text-sm mb-6">{message}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-sm font-medium rounded-sm transition-all duration-200"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
