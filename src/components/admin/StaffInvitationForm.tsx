"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BusinessRole } from "@/lib/roles";

export function StaffInvitationForm({ allowSuperadmin = false }: { allowSuperadmin?: boolean }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<BusinessRole>("OPERACIONES_VENTAS");
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setMessageKind("success");
    startTransition(async () => {
      const response = await fetch("/api/admin/usuarios/invitaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, role }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setMessageKind("error");
        setMessage(typeof result?.error === "string" ? result.error : "No se pudo enviar la invitación.");
        return;
      }
      setFirstName(""); setLastName(""); setEmail("");
      setMessage("Invitación enviada. El rol se aplicará al aceptar el correo.");
      router.refresh();
    });
  }

  return <form onSubmit={submit} className="mt-6 rounded-md border border-primary/20 bg-primary/5 p-5"><div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_220px_auto] md:items-end"><label className="text-sm font-bold text-dark">Nombre<input className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 font-normal outline-primary" required value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label className="text-sm font-bold text-dark">Apellido<input className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 font-normal outline-primary" required value={lastName} onChange={(event) => setLastName(event.target.value)} /></label><label className="text-sm font-bold text-dark">Correo<input className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 font-normal outline-primary" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="empleado@empresa.com" /></label><label className="text-sm font-bold text-dark">Rol inicial<select className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 font-normal outline-primary" value={role} onChange={(event) => setRole(event.target.value as BusinessRole)}><option value="GERENCIA">Gerencia</option><option value="OPERACIONES_VENTAS">Operaciones y ventas</option>{allowSuperadmin ? <option value="SUPERADMIN">Superadmin</option> : null}</select></label><button className="h-11 rounded-md bg-primary px-5 text-sm font-extrabold text-white disabled:opacity-50" type="submit" disabled={isPending}>{isPending ? "Enviando…" : "Invitar"}</button></div><p className="mt-3 text-xs leading-5 text-gray-text">La invitación se envía con Clerk y queda auditada. El registro público siempre crea CUSTOMER.</p>{message ? <p className="mt-3 text-sm font-bold text-dark" role={messageKind === "error" ? "alert" : "status"} aria-live={messageKind === "error" ? "assertive" : "polite"}>{message}</p> : null}</form>;
}
