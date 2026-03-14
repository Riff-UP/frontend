import { MdOutlineAddPhotoAlternate } from 'react-icons/md';

interface PublicationFormProps {
  text: string;
  selectedMediaPreview: string | null;
  selectedMediaType: 'image' | 'video' | null;
  onTextChange: (value: string) => void;
  onMediaSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPublish: () => void;
  onCancel: () => void;
  isUploading?: boolean;
  uploadProgress?: number | null;
  uploadStage?: string;
}

export default function PublicationForm({
  text,
  selectedMediaPreview,
  selectedMediaType,
  onTextChange,
  onMediaSelect,
  onPublish,
  onCancel,
  isUploading = false,
  uploadProgress = null,
  uploadStage = '',
}: PublicationFormProps) {
  const showProgress = isUploading && typeof uploadProgress === 'number';

  return (
    <div className="w-full lg:max-w-2xl mb-6">
      <div className="bg-riff-header rounded-sm p-4 sm:p-5">
        <h3 className="text-white text-base sm:text-lg font-semibold mb-4">Crear publicación</h3>
        
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="¿Qué está pasando?"
          rows={4}
          className="w-full px-3 py-3 bg-riff-text-primary/40 border border-white/10 rounded-sm text-white placeholder-riff-text-secondary text-sm
                   focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                   transition-all duration-200 resize-none mb-3"
        />

        {selectedMediaPreview && (
          <div className="mb-3 overflow-hidden rounded-sm">
            {selectedMediaType === 'video' ? (
              <video
                src={selectedMediaPreview}
                controls
                className="w-full h-auto max-h-80 object-contain"
              />
            ) : (
              <img
                src={selectedMediaPreview}
                alt="Selected"
                className="w-full h-auto max-h-80 object-contain"
              />
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-riff-primary hover:text-riff-primary/80 cursor-pointer mb-3 w-fit">
          <MdOutlineAddPhotoAlternate className="w-5 h-5" />
          <span className="text-sm">Añadir imagen o video</span>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={onMediaSelect}
            className="hidden"
          />
        </label>

        {showProgress && (
          <div className="mb-3 rounded-sm border border-white/10 bg-riff-text-primary/30 p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs text-white/80">
              <span>{uploadStage || 'Subiendo archivo...'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-riff-primary-dark to-riff-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="flex-1 px-4 py-2 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={onPublish}
            disabled={(!text.trim() && !selectedMediaPreview) || isUploading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white text-sm font-medium rounded-sm hover:from-riff-primary hover:to-riff-primary-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Subiendo...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
