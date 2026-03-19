import AuthLayout from "../components/auth/AuthLayout";
import Register from "../components/auth/Register";
import PrivacyBanner from "../components/common/PrivacyBanner";

export default function RegisterPage() {
  return (
    <>
      <AuthLayout>
        <Register />
      </AuthLayout>
      <PrivacyBanner />
    </>
  );
}
