// src/app/hooks/useLogout.ts
'use client';

import { useRouter } from 'next/navigation';

export function useLogout() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return { handleLogout };
}