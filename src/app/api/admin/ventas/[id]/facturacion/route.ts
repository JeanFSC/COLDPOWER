import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { sales } from "@/db/sales-schema";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";

const invoiceStatuses = ["PENDING", "ISSUED", "VOID", "ERROR"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("sales.manage"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("SALES_FORBIDDEN", "No tienes permiso para gestionar la facturación.", 403); return apiError("SALES_AUTH_UNAVAILABLE", "No se pudo validar el acceso a ventas.", 503); }
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const invoiceStatus = typeof input.invoiceStatus === "string" && (invoiceStatuses as readonly string[]).includes(input.invoiceStatus) ? input.invoiceStatus as (typeof invoiceStatuses)[number] : null;
  const externalReference = typeof input.externalInvoiceReference === "string" ? input.externalInvoiceReference.trim().slice(0, 160) : "";
  if (!invoiceStatus) return apiError("INVALID_INVOICE_STATUS", "Estado de facturación inválido.", 400);
  if (invoiceStatus === "ISSUED" && !externalReference) return apiError("INVOICE_REFERENCE_REQUIRED", "Una factura emitida requiere la referencia externa del proveedor.", 400);
  try {
    const result = await getDb().transaction(async (tx) => {
      const [before] = await tx.select().from(sales).where(eq(sales.id, id)).for("update").limit(1);
      if (!before) throw new Error("Venta no encontrada.");
      const [after] = await tx.update(sales).set({ invoiceStatus, externalInvoiceReference: externalReference || null, updatedAt: new Date() }).where(eq(sales.id, id)).returning();
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "sales.invoice_status_updated", entityType: "sale", entityId: id, before: { invoiceStatus: before.invoiceStatus, externalInvoiceReference: before.externalInvoiceReference }, after: { invoiceStatus: after.invoiceStatus, externalInvoiceReference: after.externalInvoiceReference }, metadata: { providerReferenceOnly: true } });
      return after;
    });
    return apiSuccess({ sale: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la facturación.";
    return apiError(message.includes("no encontrada") ? "SALE_NOT_FOUND" : "INVOICE_STATUS_NOT_UPDATED", message, message.includes("no encontrada") ? 404 : 409);
  }
}
