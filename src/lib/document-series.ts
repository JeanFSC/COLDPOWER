import { and, asc, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { documentSeries } from "@/db/schema";

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

// Same before-cutoff convention as previousLocationsCount / countActivePriceTypesBefore:
// series existing before the cutoff, active or not, approximate what was active back then
// isn't tracked historically, so this counts rows created before the cutoff as the closest
// honest baseline rather than fabricating a trend.
export async function countActiveDocumentSeriesBefore(cutoff: Date): Promise<number> {
  const rows = await getDb()
    .select({ id: documentSeries.id })
    .from(documentSeries)
    .where(and(eq(documentSeries.active, true), lt(documentSeries.createdAt, cutoff)));
  return rows.length;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export async function createDocumentSeries(input: { code: string; label: string; documentType: string; prefix: string; padding?: number; actorId?: string }) {
  const code = normalizeCode(input.code);
  if (!code) throw new Error("code es obligatorio.");
  const label = input.label.trim();
  if (!label) throw new Error("label es obligatorio.");
  const prefix = input.prefix.trim();
  if (!prefix) throw new Error("prefix es obligatorio.");
  if (!DOCUMENT_TYPES.some((type) => type.value === input.documentType)) throw new Error("documentType inválido.");
  const padding = input.padding && input.padding >= 1 && input.padding <= 10 ? input.padding : 6;
  const db = getDb();
  const [existing] = await db.select({ id: documentSeries.id }).from(documentSeries).where(eq(documentSeries.code, code)).limit(1);
  if (existing) throw new Error(`Ya existe una serie con código "${code}".`);
  const [created] = await db.insert(documentSeries).values({
    id: `series-${crypto.randomUUID()}`,
    code,
    label,
    documentType: input.documentType,
    prefix,
    padding,
    nextNumber: 1,
    active: true,
    createdBy: input.actorId,
    updatedBy: input.actorId,
  }).returning();
  return created;
}

export async function setDocumentSeriesActive(id: string, active: boolean, actorId?: string) {
  const [updated] = await getDb().update(documentSeries).set({ active, updatedBy: actorId, updatedAt: new Date() }).where(eq(documentSeries.id, id)).returning();
  if (!updated) throw new Error("Serie no encontrada.");
  return updated;
}
