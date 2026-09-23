import { and, asc, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, documentSeries } from "@/db/schema";

export const DOCUMENT_TYPES = [
  { value: "QUOTE", label: "Cotización" },
  { value: "ORDER", label: "Pedido" },
  { value: "SALE", label: "Venta" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "PURCHASE_REQUEST", label: "Solicitud de compra" },
  { value: "PURCHASE_RECEIPT", label: "Recepción de compra" },
  { value: "OTHER", label: "Otro" },
] as const;
export type DocumentSeriesType = (typeof DOCUMENT_TYPES)[number]["value"];
export type DocumentSeriesRow = typeof documentSeries.$inferSelect;

export async function listDocumentSeries(): Promise<DocumentSeriesRow[]> {
  return getDb().select().from(documentSeries).orderBy(asc(documentSeries.code));
}

export async function countActiveDocumentSeries(): Promise<number> {
  const rows = await getDb().select({ id: documentSeries.id }).from(documentSeries).where(eq(documentSeries.active, true));
  return rows.length;
}

export async function countActiveDocumentSeriesBefore(cutoff: Date): Promise<number> {
  const rows = await getDb().select({ id: documentSeries.id }).from(documentSeries).where(and(eq(documentSeries.active, true), lt(documentSeries.createdAt, cutoff)));
  return rows.length;
}

function normalizeCode(code: string) { return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, ""); }
function seriesSnapshot(row: DocumentSeriesRow) { return { id: row.id, code: row.code, label: row.label, documentType: row.documentType, prefix: row.prefix, nextNumber: row.nextNumber, padding: row.padding, active: row.active }; }

export async function createDocumentSeries(input: { code: string; label: string; documentType: string; prefix: string; padding?: number; actorId?: string; actorRole?: string }) {
  const code = normalizeCode(input.code);
  if (!code) throw new Error("code es obligatorio.");
  const label = input.label.trim();
  if (!label) throw new Error("label es obligatorio.");
  const prefix = input.prefix.trim();
  if (!prefix) throw new Error("prefix es obligatorio.");
  if (!DOCUMENT_TYPES.some((type) => type.value === input.documentType)) throw new Error("documentType inválido.");
  const padding = input.padding && input.padding >= 1 && input.padding <= 10 ? input.padding : 6;
  return getDb().transaction(async (tx) => {
    const [existing] = await tx.select({ id: documentSeries.id }).from(documentSeries).where(eq(documentSeries.code, code)).limit(1);
    if (existing) throw new Error(`Ya existe una serie con código "${code}".`);
    const [created] = await tx.insert(documentSeries).values({ id: `series-${crypto.randomUUID()}`, code, label, documentType: input.documentType, prefix, padding, nextNumber: 1, active: true, createdBy: input.actorId, updatedBy: input.actorId }).returning();
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: input.actorId, actorRole: input.actorRole ?? "SYSTEM", action: "company.document_series_created", entityType: "document_series", entityId: created.id, before: null, after: seriesSnapshot(created), metadata: { source: "admin" } });
    return created;
  });
}

export async function setDocumentSeriesActive(id: string, active: boolean, actorId?: string, actorRole?: string) {
  return getDb().transaction(async (tx) => {
    const [current] = await tx.select().from(documentSeries).where(eq(documentSeries.id, id)).limit(1);
    if (!current) throw new Error("Serie no encontrada.");
    const [updated] = await tx.update(documentSeries).set({ active, updatedBy: actorId, updatedAt: new Date() }).where(eq(documentSeries.id, id)).returning();
    if (!updated) throw new Error("Serie no encontrada.");
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId, actorRole: actorRole ?? "SYSTEM", action: "company.document_series_status_changed", entityType: "document_series", entityId: id, before: seriesSnapshot(current), after: seriesSnapshot(updated), metadata: { source: "admin", statusChange: current.active !== active } });
    return updated;
  });
}
