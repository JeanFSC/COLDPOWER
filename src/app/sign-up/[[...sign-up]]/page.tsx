import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { ClerkAuthPanel } from "@/components/auth/ClerkAuthPanel";
import { AuthPreviewForm } from "@/components/auth/AuthPreviewForm";
import { isAuthConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Crear cuenta | ColdPower",
  description: "Crea tu cuenta ColdPower para guardar tus cotizaciones.",
};

export default function SignUpPage() {
  return (
    <AuthCard mode="sign-up">
      {isAuthConfigured ? (
        <ClerkAuthPanel mode="sign-up" fallbackRedirectUrl="/auth/after-sign-in" />
      ) : (
        <AuthPreviewForm mode="sign-up" />
      )}
    </AuthCard>
  );
}
