"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppRole } from "@/lib/roles";
import type { UserStatus } from "@/lib/user-administration";

const roleOptions: { value: AppRole; label: string }[] = [
  { value: "customer", label: "Cliente" },
  { value: "GERENCIA", label: "Gerencia" },
  { value: "OPERACIONES_VENTAS", label: "Operaciones y ventas" },
  { value: "SUPERADMIN", label: "Superadmin" },
  { value: "ADMIN", label: "Admin / compatibilidad" },
  { value: "VENTAS", label: "Ventas / compatibilidad" },
  { value: "ALMACEN", label: "Almacén / compatibilidad" },
  { value: "COMPRAS", label: "Compras / compatibilidad" },
  { value: "REPORTES", label: "Reportes / compatibilidad" },
  { value: "JEFATURA", label: "Jefatura / compatibilidad" },
  { value: "admin", label: "Administrador legacy" },
];

const statusOptions: { value: UserStatus; label: string }[] = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "SUSPENDED", label: "Suspendido" },
];

export function UserRoleControl({ userId, role, status }: { userId: string; role: AppRole; status: UserStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update(payload: { role?: AppRole; status?: UserStatus }) {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/usuarios/" + userId, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: { message?: string } | string } | null;
        setError(typeof result?.error === "string" ? result.error : result?.error?.message ?? "No se pudo actualizar el usuario.");
        return;
      }
      router.refresh();
    });
  }

  return <div className="space-y-2">
    <select aria-label="Rol del usuario" className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm font-bold text-dark disabled:opacity-55" value={role} disabled={isPending} onChange={(event) => update({ role: event.target.value as AppRole })}>
      {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <select aria-label="Estado del usuario" className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm font-bold text-dark disabled:opacity-55" value={status} disabled={isPending} onChange={(event) => update({ status: event.target.value as UserStatus })}>
      {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {error ? <p className="text-xs text-danger" role="alert" aria-live="assertive">{error}</p> : null}
  </div>;
}
