"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthLayout from "../components/auth/AuthLayout";
import VerifyCode from "../components/auth/VerifyCode";

function VerifyCodeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <AuthLayout>
      <VerifyCode email={email} />
    </AuthLayout>
  );
}

export default function VerifyCodePage() {
  return (
    <Suspense fallback={<div />}>
      <VerifyCodeContent />
    </Suspense>
  );
}
