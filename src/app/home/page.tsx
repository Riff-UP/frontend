'use client'
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      setToken(tokenFromUrl);
      router.replace('/home');
    }
  }, []);

  return (
    <div>
      <h1>Bienvenido a Riff</h1>
      {token && <p>Sesión iniciada correctamente</p>}
    </div>
  );
}