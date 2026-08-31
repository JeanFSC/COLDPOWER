"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { promotionStatuses, type PromotionStatus } from "@/lib/operations-validation";

export function PromotionStatusControl({ id, status }: { id: string; status: PromotionStatus }) { const router = useRouter(); const [busy, setBusy] = useState(false); async function change(nextStatus: PromotionStatus) { setBusy(true); try { const response = await fetch(`/api/admin/promociones/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) }); if (!response.ok) throw new Error("No se pudo cambiar el estado."); router.refresh(); } finally { setBusy(false); } } return <select aria-label={`Estado de promoción ${id}`} value={status} disabled={busy} onChange={(event) => void change(event.target.value as PromotionStatus)} className="rounded-md border border-border bg-white px-2 py-1 text-xs font-bold text-dark">{promotionStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>; }
