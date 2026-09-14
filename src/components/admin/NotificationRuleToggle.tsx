"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Rule = {
  id: string;
  name: string;
  eventType: string;
  status: string;
  severity: string;
  audienceRoles: string[];
  audienceUserIds: string[];
  assigneeAudience: boolean;
  condition: Record<string, unknown>;
  templateId: string | null;
  cooldownSeconds: number;
};

// Toggling reuses the existing upsert endpoint (POST /reglas with the rule's own id) —
// there is no dedicated toggle route, so this resends the full rule payload with only
// `status` flipped, exactly what NotificationAdminControls' "create rule" form already
// does for a brand-new rule.
export function NotificationRuleToggle({ rule }: { rule: Rule }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const active = rule.status === "ACTIVE";

  async function toggle() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/notificaciones/reglas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, status: active ? "INACTIVE" : "ACTIVE" }),
      });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? `Desactivar regla ${rule.name}` : `Activar regla ${rule.name}`}
      className={`flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 shadow-2xs transition-colors disabled:opacity-60 ${active ? "justify-end bg-blue-600" : "justify-start bg-slate-300"}`}
    >
      <span className="h-3 w-3 rounded-full bg-white shadow-xs" />
    </button>
  );
}
