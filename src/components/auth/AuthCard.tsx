import Image from "next/image";
import type { ReactNode } from "react";

type AuthCardProps = {
  mode: "sign-in" | "sign-up";
  children: ReactNode;
};

export function AuthCard({ mode, children }: AuthCardProps) {
  const isSignIn = mode === "sign-in";

  return (
    <section className="bg-surface-page px-4 py-8 sm:py-12 lg:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-white shadow-float lg:grid-cols-[0.9fr_1fr]">
        <div className="relative hidden min-h-[560px] lg:block">
          <Image src="/images/auth/auth-cuenta.webp" alt="Almacén técnico ColdPower" fill sizes="45vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-primary-900/90 via-brand-primary-900/15 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 text-white"><p className="font-mono text-xs font-extrabold uppercase tracking-[0.16em] text-action-accent-500">ColdPower</p><p className="mt-3 font-display text-3xl font-black leading-tight">Tu actividad técnica, en un solo lugar.</p></div>
        </div>
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="text-center">
            <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">{isSignIn ? "Iniciar sesión" : "Crear cuenta"}</p>
            <h1 className="mt-2 font-display text-[26px] font-black leading-tight text-brand-primary-900 sm:text-3xl">{isSignIn ? "Iniciar sesión" : "Crear cuenta"}</h1>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-text-secondary sm:text-sm">{isSignIn ? "Ingresa para revisar tus cotizaciones y pedidos." : "Completa tus datos para guardar tus solicitudes y pedidos."}</p>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

