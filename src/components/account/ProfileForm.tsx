"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";

export function ProfileForm({ initialName, initialPhone }: { initialName: string; initialPhone: string }) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/cuenta/perfil", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string };
      setMessage(result.success ? "Perfil actualizado." : result.message || "No se pudo actualizar el perfil.");
    } catch {
      setMessage("No se pudo conectar con el perfil.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="mt-6 grid gap-4 border-t border-border pt-6" onSubmit={handleSubmit}>
      <p className="font-extrabold text-dark">Editar perfil</p>
      <label className="grid gap-2 text-sm font-extrabold text-dark" htmlFor="account-name">Nombre<input id="account-name" required value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-md border border-border bg-background px-3 text-sm font-medium outline-primary" autoComplete="name" /></label>
      <label className="grid gap-2 text-sm font-extrabold text-dark" htmlFor="account-phone">Telefono<input id="account-phone" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11 rounded-md border border-border bg-background px-3 text-sm font-medium outline-primary" autoComplete="tel" inputMode="tel" /></label>
      <div className="flex flex-wrap items-center gap-3"><Button type="submit" size="sm" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar cambios"}</Button>{message ? <p className="text-sm font-bold text-gray-text" role="status">{message}</p> : null}</div>
    </form>
  );
}
