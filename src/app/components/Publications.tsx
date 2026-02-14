'use client';

import { useState, useEffect } from 'react';
import { Publication } from '@/app/types';
import PublicationForm from './publications/PublicationForm';
import PublicationListCard from './publications/PublicationListCard';
import DeleteConfirmModal from './common/DeleteConfirmModal';

export default function Publications() {
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  const [publications, setPublications] = useState<Publication[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = () => {
    if (!newPost.trim() && !selectedImage) return;

    const newPublication: Publication = {
      id: Date.now(),
      author: {
        name: '',
        avatar: '',
      },
      time: 'Ahora',
      text: newPost,
      image: selectedImage || undefined,
      likes: 0,
      saved: 0,
    };

    setPublications([newPublication, ...publications]);
    setNewPost('');
    setSelectedImage(null);
  };

  const handleCancel = () => {
    setNewPost('');
    setSelectedImage(null);
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
    setOpenMenuId(null);
  };

  const confirmDelete = () => {
    if (deleteConfirmId !== null) {
      setPublications(publications.filter(pub => pub.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleEdit = (id: number, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
    setOpenMenuId(null);
  };

  const saveEdit = (id: number) => {
    setPublications(publications.map(pub =>
      pub.id === id ? { ...pub, text: editText } : pub
    ));
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-container')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  return (
    <div className="w-full">
      <div className="w-full flex flex-col items-center">
        {/* Title */}
        <div className="w-full lg:max-w-2xl mb-6">
          <h2 className="text-white text-xl sm:text-2xl font-bold">Publicaciones</h2>
          <p className="text-white/80 text-xs sm:text-sm mt-1">
            Sube tu contenido y comparte tus ideas con la comunidad.
          </p>
        </div>

        {/* Create Publication Form */}
        <PublicationForm
          text={newPost}
          selectedImage={selectedImage}
          onTextChange={setNewPost}
          onImageSelect={handleImageSelect}
          onPublish={handlePublish}
          onCancel={handleCancel}
        />

        {/* Publications List */}
        <div className="w-full lg:max-w-2xl">
          <div className="space-y-4">
            {publications.map((pub) => (
              <PublicationListCard
                key={pub.id}
                publication={pub}
                isMenuOpen={openMenuId === pub.id}
                isEditing={editingId === pub.id}
                editText={editText}
                onMenuToggle={() => setOpenMenuId(openMenuId === pub.id ? null : pub.id)}
                onEdit={() => handleEdit(pub.id, pub.text || '')}
                onDelete={() => handleDelete(pub.id)}
                onEditTextChange={setEditText}
                onSaveEdit={() => saveEdit(pub.id)}
                onCancelEdit={cancelEdit}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Eliminar publicación"
        message="¿Estás seguro de que quieres eliminar esta publicación? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
