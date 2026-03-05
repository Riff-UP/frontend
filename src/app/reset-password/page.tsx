'use client';

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthLayout from "../components/auth/AuthLayout";
import ResetPassword from "../components/auth/ResetPassword";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || undefined;

  return <ResetPassword token={token} />;
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="text-white text-center">Cargando...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </AuthLayout>
  );
}
