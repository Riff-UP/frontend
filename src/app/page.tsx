"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/app/components/layout/Header";
import Footer from "@/app/components/layout/Footer";
import HomePage from "@/app/components/HomePage";


// Maneja el callback token de Google OAuth en la URL
function OAuthHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    const errorFromUrl = searchParams.get('error');

    if (errorFromUrl) {
      router.replace('/login?error=google_auth_failed');
      return;
    }
    if (tokenFromUrl) {
      try {
        localStorage.setItem('token', tokenFromUrl);
        window.dispatchEvent(new Event('authChange'));
        router.replace('/');
      } catch {
        router.replace('/login?error=storage_failed');
      }
    }
  }, [searchParams, router]);

  return null;
}

function HomeContent() {
  return (
    <div className="min-h-screen bg-riff-text-primary flex flex-col">
      <Header />
      <main className="flex-1">
        <HomePage />
      </main>
      <Footer />

    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-riff-text-primary flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-riff-primary" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    }>
      <OAuthHandler />
      <HomeContent />
    </Suspense>
  );
}
