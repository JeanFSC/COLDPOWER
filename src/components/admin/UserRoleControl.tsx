"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminSelect } from "@/components/admin/AdminSelect";
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

export function UserRoleControl({
  userId,
  role,
  status,
}: {
  userId: string;
  role: AppRole;
  status: UserStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function update(payload: { role?: AppRole; status?: UserStatus }) {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          error?: { message?: string } | string;
        } | null;
        setError(
          typeof result?.error === "string"
            ? result.error
            : (result?.error?.message ?? "No se pudo actualizar el usuario."),
        );
        return;
      }
      router.refresh();
    });
  }
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-slate-700">Rol</p>
        <AdminSelect
          ariaLabel="Rol del usuario"
          options={roleOptions}
          value={role}
          disabled={isPending}
          onValueChange={(value) => update({ role: value as AppRole })}
        />
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-slate-700">Estado</p>
        <AdminSelect
          ariaLabel="Estado del usuario"
          options={statusOptions}
          value={status}
          disabled={isPending}
          onValueChange={(value) => update({ status: value as UserStatus })}
        />
      </div>
      {error ? (
        <p className="text-xs text-rose-600" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
