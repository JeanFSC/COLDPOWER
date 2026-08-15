"use client";

import { ClerkDegraded, ClerkFailed, ClerkLoaded, ClerkLoading, SignIn, SignUp } from "@clerk/nextjs";
import { coldPowerClerkAppearance } from "@/components/auth/clerkAppearance";

type ClerkAuthPanelProps = {
  mode: "sign-in" | "sign-up";
  fallbackRedirectUrl?: string;
};

function AuthLoadingState() {
  return (
    <div className="mt-8 space-y-5" aria-live="polite" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
        <div className="h-11 w-full animate-pulse rounded-lg border border-slate-100 bg-slate-50" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
        <div className="h-11 w-full animate-pulse rounded-lg border border-slate-100 bg-slate-50" />
      </div>
      <div className="h-11 w-full animate-pulse rounded-lg bg-slate-100" />
      <p className="text-center text-xs font-medium text-text-secondary">Cargando autenticación segura…</p>
    </div>
  );
}

function AuthUnavailableState({ degraded = false }: { degraded?: boolean }) {
  return (
    <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center" aria-live="assertive" role="alert">
      <p className="text-sm font-extrabold text-amber-950">
        {degraded ? "La autenticación está tardando más de lo esperado." : "No pudimos conectar con la autenticación."}
      </p>
      <p className="mt-1 text-xs leading-5 text-amber-900/80">
        Verifica tu conexión e inténtalo nuevamente. Tu información no se ha enviado.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-brand-primary-500 px-5 text-xs font-extrabold text-white transition hover:bg-brand-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary-500 focus-visible:ring-offset-2"
      >
        Reintentar
      </button>
    </div>
  );
}

export function ClerkAuthPanel({ mode, fallbackRedirectUrl = "/auth/after-sign-in" }: ClerkAuthPanelProps) {
  const isSignIn = mode === "sign-in";

  return (
    <div className="relative min-h-[360px]" data-auth-panel={mode}>
      <ClerkLoading>
        <AuthLoadingState />
        <div className="auth-timeout-state">
          <AuthUnavailableState degraded />
        </div>
      </ClerkLoading>

      <ClerkFailed>
        <AuthUnavailableState />
      </ClerkFailed>

      <ClerkDegraded>
        <AuthUnavailableState degraded />
      </ClerkDegraded>

      <ClerkLoaded>
        {isSignIn ? (
          <SignIn
            path="/sign-in"
            routing="path"
            fallbackRedirectUrl={fallbackRedirectUrl}
            appearance={coldPowerClerkAppearance}
          />
        ) : (
          <SignUp
            path="/sign-up"
            routing="path"
            fallbackRedirectUrl={fallbackRedirectUrl}
            appearance={coldPowerClerkAppearance}
          />
        )}
      </ClerkLoaded>
    </div>
  );
}
