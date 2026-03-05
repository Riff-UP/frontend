'use client';

import { useState } from 'react';
import { MdBookmark, MdBookmarkBorder } from 'react-icons/md';
import { useSavedPosts } from '@/app/hooks/useSavedPosts';

interface SavePostButtonProps {
  postId: string;
  userId: string;
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function SavePostButton({
  postId,
  userId,
  className = '',
  showCount = false,
  size = 'md'
}: SavePostButtonProps) {
  const { savedPosts, savePost, unsavePost, isPostSaved } = useSavedPosts(userId);
  const [isLoading, setIsLoading] = useState(false);

  const isSaved = isPostSaved(postId);
  const savedPost = savedPosts.find(sp => sp.postId === postId);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isLoading) return;

    setIsLoading(true);

    try {
      if (isSaved && savedPost) {
        await unsavePost(savedPost.id);
      } else {
        await savePost(postId, userId);
      }
    } catch (error) {
      console.error('Error toggling save post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleSave}
      disabled={isLoading}
      className={`flex items-center gap-2 transition-colors ${
        isSaved 
          ? 'text-yellow-400 hover:text-yellow-300' 
          : 'text-riff-text-secondary hover:text-yellow-400'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      title={isSaved ? 'Quitar de guardados' : 'Guardar post'}
    >
      {isSaved ? (
        <MdBookmark className={sizeClasses[size]} />
      ) : (
        <MdBookmarkBorder className={sizeClasses[size]} />
      )}
      {showCount && (
        <span className="text-xs">{savedPosts.filter(sp => sp.postId === postId).length}</span>
      )}
    </button>
  );
}

