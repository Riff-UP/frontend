'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { BsThreeDots } from 'react-icons/bs';
import { AiOutlineHeart } from 'react-icons/ai';
import { BsBookmark } from 'react-icons/bs';
import { MdOutlineAddPhotoAlternate, MdEdit, MdDelete } from 'react-icons/md';

interface Publication {
  id: number;
  author: {
    name: string;
    avatar: string;
  };
  time: string;
  text: string;
  image?: string;
  likes: number;
  saved: number;
}

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
      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-riff-card border border-white/20 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <MdDelete className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-white text-lg font-semibold">Eliminar publicación</h3>
            </div>
            <p className="text-riff-text-secondary text-sm mb-6">
              ¿Estás seguro de que quieres eliminar esta publicación? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2.5 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-riff-delete to-riff-delete-2 hover:from-riff-delete-2 hover:to-riff-delete text-white text-sm font-medium rounded-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                <MdDelete className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Publications List */}
        <div className="flex-1 order-2 lg:order-1">
          <h2 className="text-white text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Publicaciones</h2>
          
          <div className="space-y-4">
            {publications.map((pub) => (
              <div key={pub.id} className="bg-riff-header border border-white/10 rounded-sm p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-riff-text-secondary/30 flex-shrink-0">
                      <Image
                        src={pub.author.avatar}
                        alt={pub.author.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{pub.author.name}</h3>
                      <p className="text-riff-text-secondary text-xs">{pub.time}</p>
                    </div>
                  </div>
                  <div className="relative menu-container">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === pub.id ? null : pub.id)}
                      className="text-white/50 hover:text-riff-primary transition-colors"
                    >
                      <BsThreeDots className="w-5 h-5" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {openMenuId === pub.id && (
                      <div className="absolute right-0 top-8 bg-riff-text-primary border border-white/20 rounded-sm shadow-lg z-10 min-w-[140px] overflow-hidden">
                        <button
                          onClick={() => handleEdit(pub.id, pub.text)}
                          className="w-full px-4 py-2 text-left text-white text-sm hover:bg-riff-primary/20 transition-colors flex items-center gap-2"
                        >
                          <MdEdit className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(pub.id)}
                          className="w-full px-4 py-2 text-left text-red-400 text-sm hover:bg-red-500/20 transition-colors flex items-center gap-2"
                        >
                          <MdDelete className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                {editingId === pub.id ? (
                  <div className="mb-3 space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white placeholder-riff-text-secondary text-sm
                               focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                               transition-all duration-200 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(pub.id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white text-xs font-medium rounded-sm hover:from-riff-primary hover:to-riff-primary-dark transition-all duration-200"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-xs font-medium rounded-sm border border-white/20 transition-colors duration-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-white text-sm mb-3">{pub.text}</p>
                )}

                {/* Image */}
                {pub.image && (
                  <div className="relative w-full h-48 sm:h-64 mb-3 rounded-sm overflow-hidden">
                    <Image
                      src={pub.image}
                      alt="Publicación"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 pt-3">
                  <div className="flex items-center gap-1.5 text-white/50">
                    <AiOutlineHeart className="w-5 h-5" />
                    <span className="text-sm">{pub.likes}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-white/50">
                    <BsBookmark className="w-5 h-5" />
                    <span className="text-sm">{pub.saved}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Publication Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0 order-1 lg:order-2">
          <div className="bg-riff-header border border-white/10 rounded-sm p-4 lg:sticky lg:top-6">
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-sm sm:text-base mb-2 sm:mb-3">¿Qué tienes en mente?</h3>
              <p className="text-riff-text-secondary text-xs sm:text-sm mb-2 sm:mb-3">Comparte tus ideas...</p>
              
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Escribe algo..."
                rows={4}
                className="w-full px-3 py-2 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white placeholder-riff-text-secondary text-sm
                         focus:outline-none focus:ring-2 focus:ring-riff-primary focus:border-riff-primary
                         transition-all duration-200 resize-none"
              />

              {selectedImage && (
                <div className="relative w-full h-32 rounded-sm overflow-hidden">
                  <Image
                    src={selectedImage}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                  </button>
                </div>
              )}

              <label className="flex items-center gap-2 text-white/60 hover:text-riff-primary cursor-pointer transition-colors">
                <MdOutlineAddPhotoAlternate className="w-5 h-5" />
                <span className="text-sm">Agregar imagen</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-3 py-2 bg-riff-text-secondary/30 hover:bg-riff-text-secondary/40 text-white text-sm font-medium rounded-sm border border-white/20 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePublish}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-riff-primary-dark to-riff-primary text-white text-sm font-medium rounded-sm hover:from-riff-primary hover:to-riff-primary-dark transition-all duration-200"
                  disabled={!newPost.trim() && !selectedImage}
                >
                  Publicar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
