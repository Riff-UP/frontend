import { MdOutlineAddPhotoAlternate } from 'react-icons/md';

interface PublicationFormProps {
  text: string;
  selectedImage: string | null;
  onTextChange: (value: string) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPublish: () => void;
  onCancel: () => void;
}

export default function PublicationForm({
  text,
  selectedImage,
  onTextChange,
  onImageSelect,
  onPublish,
  onCancel,
}: PublicationFormProps) {
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

        {selectedImage && (
          <div className="mb-3 overflow-hidden rounded-sm">
            <img
              src={selectedImage}
              alt="Selected"
              className="w-full h-auto max-h-80 object-contain"
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-riff-primary hover:text-riff-primary/80 cursor-pointer mb-3 w-fit">
          <MdOutlineAddPhotoAlternate className="w-5 h-5" />
          <span className="text-sm">Añadir imagen</span>
          <input
            type="file"
            accept="image/*"
            onChange={onImageSelect}
            className="hidden"
          />
        </label>

        <div className="flex gap-2 pt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={onPublish}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white text-sm font-medium rounded-sm hover:from-riff-primary hover:to-riff-primary-dark transition-all duration-200"
            disabled={!text.trim() && !selectedImage}
          >
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}
