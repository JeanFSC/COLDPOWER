"use client";

import { Building2, Eye, EyeOff, Globe2, LockKeyhole, Mail, PanelsTopLeft, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

type AuthPreviewFormProps = {
  mode: "sign-in" | "sign-up";
};

const inputClassName =
  "h-11 w-full rounded-md border border-border bg-white pl-10 pr-3 text-sm font-semibold text-brand-primary-900 outline-none transition placeholder:text-text-secondary/70 focus:border-brand-secondary-600 focus:ring-2 focus:ring-brand-secondary-600/10";

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-xs font-extrabold text-brand-primary-900">
      <span>{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-secondary" aria-hidden="true">
          {icon}
        </span>
        {children}
      </span>
    </label>
  );
}

function PasswordInput({ name, placeholder, autoComplete }: { name: string; placeholder: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative block">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-secondary" aria-hidden="true">
        <LockKeyhole className="h-4 w-4" />
      </span>
      <input
        className={`${inputClassName} pr-10`}
        type={visible ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-text-secondary transition hover:text-brand-primary-900"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </span>
  );
}

function SocialButtons({ onUnavailable }: { onUnavailable: () => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={onUnavailable} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-white text-sm font-extrabold text-brand-primary-900 transition hover:border-brand-secondary-600 hover:bg-surface-page">
        <Globe2 className="h-4 w-4 text-[#4285f4]" aria-hidden="true" />
        Google
      </button>
      <button type="button" onClick={onUnavailable} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-white text-sm font-extrabold text-brand-primary-900 transition hover:border-brand-secondary-600 hover:bg-surface-page">
        <PanelsTopLeft className="h-4 w-4 text-[#f25022]" aria-hidden="true" />
        Microsoft
      </button>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold text-text-secondary">
      <span className="h-px flex-1 bg-border" />
      <span>o continúa con</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function AuthPreviewForm({ mode }: AuthPreviewFormProps) {
  const isSignIn = mode === "sign-in";
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      isSignIn
        ? "El inicio de sesión aún no está configurado en este entorno. Solicita configurar Clerk y la base de datos para poder ingresar."
        : "El registro aún no está configurado en este entorno. Solicita configurar Clerk y la base de datos para crear una cuenta.",
    );
  }

  function handleUnavailableSocialLogin() {
    setMessage("El acceso con Google y Microsoft aún no está configurado en este entorno.");
  }

  if (isSignIn) {
    return (
      <form className="mt-7 grid gap-5" onSubmit={handleSubmit}>
        <Field label="Correo electrónico" icon={<Mail className="h-4 w-4" />}>
          <input className={inputClassName} type="email" name="email" placeholder="ejemplo@empresa.com" autoComplete="email" />
        </Field>
        <Field label="Contraseña">
          <PasswordInput name="password" placeholder="Ingresa tu contraseña" autoComplete="current-password" />
        </Field>
        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-text-secondary">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="remember" className="h-4 w-4 rounded border-border accent-brand-secondary-600" />
            Recordarme
          </label>
          <Link href="/contacto" className="font-extrabold text-brand-secondary-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-hover">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          Iniciar sesión
        </button>
        {message ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900" role="status" aria-live="polite">{message}</p> : null}
        <Divider />
        <SocialButtons onUnavailable={handleUnavailableSocialLogin} />
        <p className="pt-1 text-center text-sm font-semibold text-text-secondary">
          ¿Aún no tienes cuenta? <Link href="/sign-up" className="font-extrabold text-brand-secondary-600 hover:underline">Crear cuenta</Link>
        </p>
      </form>
    );
  }

  return (
    <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
      <Field label="Nombre completo" icon={<UserRound className="h-4 w-4" />}>
        <input className={inputClassName} type="text" name="name" placeholder="Ingresa tu nombre completo" autoComplete="name" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Correo electrónico" icon={<Mail className="h-4 w-4" />}>
          <input className={inputClassName} type="email" name="email" placeholder="ejemplo@empresa.com" autoComplete="email" />
        </Field>
        <Field label="Teléfono" icon={<Phone className="h-4 w-4" />}>
          <input className={inputClassName} type="tel" name="phone" placeholder="9 999 999 999" autoComplete="tel" />
        </Field>
      </div>
      <Field label="RUC de la empresa (opcional)" icon={<Building2 className="h-4 w-4" />}>
        <input className={inputClassName} type="text" name="company-tax-id" placeholder="20XXXXXXXXX" autoComplete="organization" />
      </Field>
      <Field label="Contraseña">
        <PasswordInput name="password" placeholder="Crea tu contraseña" autoComplete="new-password" />
      </Field>
      <Field label="Confirmar contraseña">
        <PasswordInput name="password-confirmation" placeholder="Confirma tu contraseña" autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-2 pt-1 text-[11px] font-semibold leading-4 text-text-secondary">
        <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-brand-secondary-600" />
        <span>
          Acepto los <Link href="/contacto" className="font-extrabold text-brand-secondary-600 hover:underline">Términos y condiciones</Link> y la <Link href="/contacto" className="font-extrabold text-brand-secondary-600 hover:underline">Política de privacidad</Link>.
        </span>
      </label>
      <button type="submit" className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-hover">
        <UserRound className="h-4 w-4" aria-hidden="true" />
        Crear cuenta
      </button>
      {message ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900" role="status" aria-live="polite">{message}</p> : null}
      <p className="pt-1 text-center text-sm font-semibold text-text-secondary">
        ¿Ya tienes cuenta? <Link href="/sign-in" className="font-extrabold text-brand-secondary-600 hover:underline">Iniciar sesión</Link>
      </p>
    </form>
  );
}
