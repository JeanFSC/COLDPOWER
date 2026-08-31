import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { ClerkAuthPanel } from "@/components/auth/ClerkAuthPanel";
import { AuthPreviewForm } from "@/components/auth/AuthPreviewForm";
import { isAuthConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Iniciar sesión | ColdPower",
  description: "Inicia sesión en tu cuenta ColdPower para ver tus cotizaciones.",
};

export default function SignInPage() {
  return (
    <AuthCard mode="sign-in">
      {isAuthConfigured ? (
        <ClerkAuthPanel mode="sign-in" fallbackRedirectUrl="/auth/after-sign-in" />
      ) : (
        <AuthPreviewForm mode="sign-in" />
      )}
    </AuthCard>
  );
}
