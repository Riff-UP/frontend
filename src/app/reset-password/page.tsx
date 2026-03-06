'use client';

import { useSearchParams } from "next/navigation";
import AuthLayout from "../components/auth/AuthLayout";
import ResetPassword from "../components/auth/ResetPassword";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || undefined;

  return (
    <AuthLayout>
      <ResetPassword token={token} />
    </AuthLayout>
  );
}
