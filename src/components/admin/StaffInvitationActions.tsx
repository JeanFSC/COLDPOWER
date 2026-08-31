"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClerkInvitationItem } from "@/lib/user-administration";

export function StaffInvitationActions({ invitation }: { invitation: ClerkInvitationItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  function action(value: "cancel" | "resend") {
    setMessage(null);
    setMessageKind("success");
    startTransition(async () => {
      const response = await fetch(`/api/admin/usuarios/invitaciones/${invitation.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: value }) });
      const result = await response.json().catch(() => null) as { error?: { message?: string } | string } | null;
      if (!response.ok) { setMessageKind("error"); setMessage(typeof result?.error === "string" ? result.error : result?.error?.message ?? "No se pudo gestionar la invitación."); return; }
      setMessage(value === "cancel" ? "Invitación cancelada." : "Invitación reenviada.");
      router.refresh();
    });
  }
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e3ebf2] bg-[#fbfcfd] p-3"><div><p className="text-[10px] font-extrabold text-[#304b66]">Invitación pendiente · {invitation.emailAddress}</p><p className="mt-1 text-[10px] text-[#8296a9]">Rol: {invitation.role ?? "Sin rol"} · Creada: {invitation.createdAt.toLocaleDateString("es-PE")}</p>{message ? <p className="mt-1 text-[10px] font-bold text-[#2277ee]" role={messageKind === "error" ? "alert" : "status"} aria-live={messageKind === "error" ? "assertive" : "polite"}>{message}</p> : null}</div><div className="flex gap-2"><button type="button" disabled={isPending} onClick={() => action("resend")} className="rounded-md border border-[#dce6ee] px-3 py-2 text-[10px] font-extrabold text-[#304b66] disabled:opacity-50">Reenviar</button><button type="button" disabled={isPending} onClick={() => action("cancel")} className="rounded-md border border-[#ffd3d3] px-3 py-2 text-[10px] font-extrabold text-[#c84848] disabled:opacity-50">Cancelar</button></div></div>;
}
