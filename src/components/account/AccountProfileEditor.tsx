"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export type AccountProfileEditorValue = {
  customerId: string | null;
  name: string | null;
  phone: string | null;
  companyName: string | null;
  primaryAddress: { address: string; location: string | null } | null;
  contactPreference: string | null;
};

type FormState = {
  name: string;
  phone: string;
  companyName: string;
  address: string;
  contactPreference: string;
};

function initialForm(profile: AccountProfileEditorValue): FormState {
  return {
    name: profile.name ?? "",
    phone: profile.phone ?? "",
    companyName: profile.companyName ?? "",
    address: profile.primaryAddress?.address ?? "",
    contactPreference: profile.contactPreference ?? "",
  };
}

export function AccountProfileEditor({ profile }: { profile: AccountProfileEditorValue }) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(() => initialForm(profile));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function openEditor() {
    setForm(initialForm(profile));
    setError("");
    setFeedback("");
    setIsOpen(true);
  }

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), [role='radio']:not([aria-disabled='true'])",
      ),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/cuenta/perfil", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          ...(profile.customerId
            ? {
                companyName: form.companyName.trim() || null,
                address: form.address.trim() || null,
                contactPreference: form.contactPreference || null,
              }
            : {}),
        }),
      });
      const result = (await response.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (!response.ok || !result?.success) {
        setError(result?.message || "No se pudo actualizar tu información.");
        return;
      }
      setIsOpen(false);
      setFeedback("Información actualizada.");
      router.refresh();
    } catch {
      setError("No se pudo conectar con tu cuenta. Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openEditor}
          className="inline-flex h-10 items-center justify-center rounded-pill border border-[#b9d5e9] bg-white px-4 text-sm font-extrabold text-primary transition hover:border-primary hover:bg-[#f3f9fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Editar información
        </button>
        {feedback ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-teal" role="status">
            <Check className="h-4 w-4" aria-hidden="true" />
            {feedback}
          </p>
        ) : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex justify-end bg-[#071a2b]/45 backdrop-blur-[2px]" onMouseDown={() => setIsOpen(false)}>
          <div
            className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-profile-editor-title"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={handleDialogKeyDown}
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Mi cuenta</p>
                <h2 id="account-profile-editor-title" className="mt-1 font-display text-2xl font-black text-dark">
                  Editar información
                </h2>
                <p className="mt-1 text-sm text-gray-text">Mantén tus datos de contacto al día.</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-text transition hover:bg-surface-page hover:text-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Cerrar edición de información"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6 sm:px-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-extrabold text-dark sm:col-span-2" htmlFor="account-editor-name">
                    Nombre completo <span className="font-medium text-gray-text">(obligatorio)</span>
                    <input id="account-editor-name" required value={form.name} onChange={(event) => update("name", event.target.value)} className="h-12 rounded-xl border border-border bg-white px-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" autoComplete="name" />
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold text-dark" htmlFor="account-editor-phone">
                    Teléfono <span className="font-medium text-gray-text">(opcional)</span>
                    <input id="account-editor-phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} className="h-12 rounded-xl border border-border bg-white px-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" autoComplete="tel" inputMode="tel" />
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold text-dark" htmlFor="account-editor-company">
                    Empresa <span className="font-medium text-gray-text">(opcional)</span>
                    <input id="account-editor-company" disabled={!profile.customerId} value={form.companyName} onChange={(event) => update("companyName", event.target.value)} className="h-12 rounded-xl border border-border bg-white px-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-page" autoComplete="organization" />
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold text-dark sm:col-span-2" htmlFor="account-editor-address">
                    Dirección principal <span className="font-medium text-gray-text">(opcional)</span>
                    <input id="account-editor-address" disabled={!profile.customerId} value={form.address} onChange={(event) => update("address", event.target.value)} className="h-12 rounded-xl border border-border bg-white px-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-page" autoComplete="street-address" />
                  </label>
                </div>

                <fieldset disabled={!profile.customerId} className="grid gap-3 disabled:opacity-65">
                  <legend className="text-sm font-extrabold text-dark">¿Cómo prefieres que te contactemos?</legend>
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Preferencia de contacto">
                    {[
                      ["email", "Correo electrónico"],
                      ["phone", "Teléfono"],
                      ["whatsapp", "WhatsApp"],
                    ].map(([value, label]) => (
                      <label key={value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-semibold text-dark has-[:checked]:border-primary has-[:checked]:bg-[#f2f8fc]">
                        <input type="radio" name="account-contact-preference" value={value} checked={form.contactPreference === value} onChange={(event) => update("contactPreference", event.target.value)} className="h-4 w-4 accent-[#0f6fae]" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {!profile.customerId ? (
                  <p className="rounded-xl border border-[#f4d59d] bg-[#fff8e8] px-4 py-3 text-sm leading-6 text-[#805b13]">
                    Tu cuenta está activa, pero todavía no encontramos un perfil comercial asociado. Puedes actualizar tus datos básicos; la información de empresa y dirección se habilitará cuando exista esa vinculación.
                  </p>
                ) : null}
                {error ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
              <footer className="flex flex-col-reverse gap-3 border-t border-border bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                <button type="button" onClick={() => setIsOpen(false)} className="inline-flex h-11 items-center justify-center rounded-pill border border-border px-5 text-sm font-extrabold text-dark transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="inline-flex h-11 items-center justify-center rounded-pill bg-primary px-5 text-sm font-extrabold text-white transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-55">
                  {isSaving ? "Guardando…" : "Guardar cambios"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
