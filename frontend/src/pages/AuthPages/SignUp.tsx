import SignUpForm from "@/components/auth/SignUpForm";
import PageMeta from "@/components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";

export default function SignUp() {
  return (
    <>
      <PageMeta
  title="Criar conta | SMART DELIVERY"
  description="Crie a sua conta na SMART DELIVERY."
/>
      /
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
