import type { ReactNode } from "react";

type AuthCardProps = {
  mode: "sign-in" | "sign-up";
  children: ReactNode;
};

export function AuthCard({ mode, children }: AuthCardProps) {
  const isSignIn = mode === "sign-in";

  return (
    <section className="bg-surface-page px-4 py-12 sm:py-16 lg:py-20">
      <div className={`mx-auto w-full rounded-lg border border-border bg-white px-6 py-8 shadow-card sm:px-10 sm:py-10 ${isSignIn ? "max-w-[430px]" : "max-w-[510px]"}`}>
        <div className="text-center">
          <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">
            {isSignIn ? "Iniciar sesión" : "Crear cuenta"}
          </p>
          <h1 className="mt-2 font-display text-[26px] font-black leading-tight text-brand-primary-900 sm:text-3xl">
            {isSignIn ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-text-secondary sm:text-sm">
            {isSignIn ? "Ingresa para revisar tus cotizaciones y pedidos." : "Completa tus datos para crear tu cuenta y comenzar a disfrutar de todos los beneficios."}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}
