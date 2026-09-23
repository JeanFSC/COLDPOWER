"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminSelect } from "@/components/admin/AdminSelect";
import type { AppRole } from "@/lib/roles";
import { userRoleCatalog, type UserStatus } from "@/lib/user-administration-contracts";

const statusOptions: { value: UserStatus; label: string }[] = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "SUSPENDED", label: "Suspendido" },
];

export function UserRoleControl({ userId, role, status }: { userId: string; role: AppRole; status: UserStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<{ payload: { role?: AppRole; status?: UserStatus }; label: string } | null>(null);

  function update(payload: { role?: AppRole; status?: UserStatus }) {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: { message?: string } | string } | null;
        setError(typeof result?.error === "string" ? result.error : (result?.error?.message ?? "No se pudo actualizar el usuario."));
        return;
      }
      setPendingChange(null);
      router.refresh();
    });
  }

  function requestUpdate(payload: { role?: AppRole; status?: UserStatus }) {
    const label = payload.role
      ? `cambiar el rol a ${userRoleCatalog.find((option) => option.value === payload.role)?.label ?? payload.role}`
      : `cambiar el estado a ${payload.status === "ACTIVE" ? "Activo" : payload.status === "INACTIVE" ? "Inactivo" : "Suspendido"}`;
    if ((payload.role ?? role) === role && (payload.status ?? status) === status) return;
    setError(null);
    setPendingChange({ payload, label });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-slate-700">Rol</p>
        <AdminSelect ariaLabel="Rol del usuario" options={userRoleCatalog} value={role} disabled={isPending} onValueChange={(value) => requestUpdate({ role: value as AppRole })} />
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-slate-700">Estado</p>
        <AdminSelect ariaLabel="Estado del usuario" options={statusOptions} value={status} disabled={isPending} onValueChange={(value) => requestUpdate({ status: value as UserStatus })} />
      </div>
      {error ? <p className="text-xs text-rose-600" role="alert" aria-live="assertive">{error}</p> : null}
      {pendingChange ? (
        <div role="alertdialog" aria-label="Confirmar cambio de acceso" className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">¿Confirmas {pendingChange.label}?</p>
          <p className="mt-1 text-[10px] leading-relaxed text-amber-700">El cambio quedará auditado y puede modificar el acceso efectivo del usuario.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => update(pendingChange.payload)} disabled={isPending} className="rounded-md bg-blue-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Confirmar</button>
            <button type="button" onClick={() => setPendingChange(null)} disabled={isPending} className="rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60">Cancelar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
