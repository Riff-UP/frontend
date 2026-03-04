/**
 * EJEMPLO DE USO - Hook usePosts
 *
 * Este archivo muestra cómo usar el hook usePosts en diferentes escenarios
 */

import { usePosts } from '@/app/hooks/usePosts';
import { useUser } from '@/app/hooks/useUser';
import { useState, useEffect } from 'react';

// ============================================
// EJEMPLO 1: Componente Simple de Publicación
// ============================================

function SimplePostComponent() {
  const { user } = useUser();
  const { posts, uploading, error, createPost } = usePosts(user?.id);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    const result = await createPost({
      content,
      imageFile: imageFile || undefined,
      tags: ['ejemplo']
    });

    if (result) {
      console.log('Post creado:', result);
      setContent('');
      setImageFile(null);
    }
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="¿Qué está pasando?"
      />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
      />

      <button onClick={handleSubmit} disabled={uploading}>
        {uploading ? 'Subiendo...' : 'Publicar'}
      </button>

      {error && <p>Error: {error}</p>}

      <div>
        {posts.map(post => (
          <div key={post.id}>
            <p>{post.content}</p>
            {post.mediaUrl && <img src={post.mediaUrl} alt="" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// EJEMPLO 2: Solo Subir Imagen
// ============================================

function ImageOnlyPost() {
  const { user } = useUser();
  const { createPost, uploading, error } = usePosts(user?.id);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await createPost({
      content: '', // Sin texto, solo imagen
      imageFile: file,
    });

    if (result) {
      console.log('Imagen subida:', result.mediaUrl);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        disabled={uploading}
      />
      {uploading && <p>Subiendo imagen...</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}

// ============================================
// EJEMPLO 3: Editar Publicación
// ============================================

function EditablePost({ postId }: { postId: string }) {
  const { user } = useUser();
  const { updatePost, loading } = usePosts(user?.id);
  const [newContent, setNewContent] = useState('');

  const handleUpdate = async () => {
    const success = await updatePost(postId, {
      content: newContent,
      tags: ['editado']
    });

    if (success) {
      console.log('Post actualizado');
    }
  };

  return (
    <div>
      <input
        value={newContent}
        onChange={(e) => setNewContent(e.target.value)}
      />
      <button onClick={handleUpdate} disabled={loading}>
        {loading ? 'Guardando...' : 'Actualizar'}
      </button>
    </div>
  );
}

// ============================================
// EJEMPLO 4: Eliminar Publicación
// ============================================

function DeletePostButton({ postId }: { postId: string }) {
  const { user } = useUser();
  const { deletePost, loading } = usePosts(user?.id);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    const success = await deletePost(postId);

    if (success) {
      console.log('Post eliminado');
      setShowConfirm(false);
    }
  };

  return (
    <div>
      <button onClick={() => setShowConfirm(true)}>
        Eliminar
      </button>

      {showConfirm && (
        <div>
          <p>¿Estás seguro?</p>
          <button onClick={handleDelete} disabled={loading}>
            Sí, eliminar
          </button>
          <button onClick={() => setShowConfirm(false)}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// EJEMPLO 5: Feed de Publicaciones con Refresh
// ============================================

function PostsFeed() {
  const { user } = useUser();
  const { posts, loading, error, fetchPosts } = usePosts(user?.id);

  // Cargar posts al montar
  useEffect(() => {
    fetchPosts();
  }, []);

  // Refresh manual
  const handleRefresh = () => {
    fetchPosts();
  };

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <button onClick={handleRefresh}>
        🔄 Refrescar
      </button>

      {posts.length === 0 ? (
        <p>No hay publicaciones</p>
      ) : (
        posts.map(post => (
          <div key={post.id}>
            <p>{post.content}</p>
            {post.mediaUrl && (
              <img src={post.mediaUrl} alt="Post media" />
            )}
            <small>{new Date(post.createdAt).toLocaleDateString()}</small>
            <p>❤️ {post.likesCount} | 💬 {post.commentsCount}</p>
          </div>
        ))
      )}
    </div>
  );
}

// ============================================
// EJEMPLO 6: Publicación con Preview de Imagen
// ============================================

function PostWithImagePreview() {
  const { user } = useUser();
  const { createPost, uploading } = usePosts(user?.id);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handlePublish = async () => {
    const result = await createPost({
      content,
      imageFile: file || undefined,
    });

    if (result) {
      // Limpiar
      setContent('');
      setFile(null);
      setPreview(null);
    }
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribe algo..."
      />

      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
      />

      {preview && (
        <div>
          <img src={preview} alt="Preview" style={{ maxWidth: 200 }} />
          <button onClick={() => {
            setFile(null);
            setPreview(null);
          }}>
            ✕ Quitar imagen
          </button>
        </div>
      )}

      <button onClick={handlePublish} disabled={uploading || (!content && !file)}>
        {uploading ? 'Subiendo...' : 'Publicar'}
      </button>
    </div>
  );
}

// ============================================
// EJEMPLO 7: Validación Antes de Subir
// ============================================

function PostWithValidation() {
  const { user } = useUser();
  const { createPost, uploading, error } = usePosts(user?.id);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setValidationError('Solo se permiten imágenes JPG, PNG, GIF, WEBP');
      return;
    }

    // Validar tamaño (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setValidationError('La imagen es muy grande. Máximo 10MB');
      return;
    }

    setValidationError(null);
    setFile(selectedFile);
  };

  const handlePublish = async () => {
    if (!content.trim() && !file) {
      setValidationError('Debes escribir algo o agregar una imagen');
      return;
    }

    const result = await createPost({
      content,
      imageFile: file || undefined,
    });

    if (result) {
      setContent('');
      setFile(null);
      setValidationError(null);
    }
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
      />

      {validationError && <p style={{ color: 'red' }}>{validationError}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button onClick={handlePublish} disabled={uploading}>
        {uploading ? 'Subiendo...' : 'Publicar'}
      </button>
    </div>
  );
}

export {
  SimplePostComponent,
  ImageOnlyPost,
  EditablePost,
  DeletePostButton,
  PostsFeed,
  PostWithImagePreview,
  PostWithValidation,
};

