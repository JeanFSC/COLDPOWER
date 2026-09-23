"use client";

import { Mail, Send, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminSelect } from "@/components/admin/AdminSelect";
import type { AppRole } from "@/lib/roles";
import { staffRoleCatalog } from "@/lib/user-administration-contracts";

type InvitationRole = Exclude<AppRole, "customer">;

export function StaffInvitationForm({ allowSuperadmin = false, roles }: { allowSuperadmin?: boolean; roles?: Array<{ value: InvitationRole; label: string }> }) {
  const router = useRouter();
  const roleOptions = (roles?.length ? roles : staffRoleCatalog).filter((option) => allowSuperadmin || option.value !== "SUPERADMIN");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>(roleOptions[0]?.value ?? "OPERACIONES_VENTAS");
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
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessageKind("error");
        setMessage(
          typeof result?.error === "string" ? result.error : "No se pudo enviar la invitación.",
        );
        return;
      }
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("Invitación enviada. El rol se aplicará al aceptar el correo.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-5 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <UserPlus className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Invitar nuevo usuario</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Crea una invitación de acceso con el rol inicial correspondiente.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.25fr_220px_auto] xl:items-end">
        <label className="block text-[11px] font-semibold text-slate-700">
          Nombre
          <input
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </label>
        <label className="block text-[11px] font-semibold text-slate-700">
          Apellido
          <input
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </label>
        <label className="block text-[11px] font-semibold text-slate-700">
          Correo
          <span className="relative mt-1.5 block">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="empleado@empresa.com"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white py-0 pl-8 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            />
          </span>
        </label>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold text-slate-700">Rol inicial</p>
          <AdminSelect
            ariaLabel="Rol inicial"
            options={roleOptions}
            value={role}
            onValueChange={(value) => setRole(value as InvitationRole)}
            disabled={isPending}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <Send className="h-3.5 w-3.5" />
          {isPending ? "Enviando..." : "Invitar"}
        </button>
      </div>
      <p className="mt-4 border-t border-blue-100 pt-3 text-[10px] leading-5 text-slate-500">
        La invitación se envía con Clerk y queda auditada. El registro público siempre crea
        CUSTOMER.
      </p>
      {message ? (
        <p
          className={`mt-3 text-xs font-semibold ${messageKind === "error" ? "text-rose-600" : "text-emerald-600"}`}
          role={messageKind === "error" ? "alert" : "status"}
          aria-live={messageKind === "error" ? "assertive" : "polite"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
