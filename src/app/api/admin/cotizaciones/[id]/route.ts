import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, quoteStatusHistory, quotes } from "@/db/schema";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getQuoteDetail } from "@/lib/quote-repository";
import { canTransitionQuote, legacyQuoteStatus, quoteWorkflowStatuses, type QuoteWorkflowStatus } from "@/lib/quote-workflow";
import { apiError, apiSuccess } from "@/lib/api-errors";

const legacyByWorkflow: Record<QuoteWorkflowStatus, (typeof quoteStatusHistory.$inferInsert)["toStatus"]> = {
  DRAFT: "borrador",
  SENT: "enviada",
  FOLLOW_UP: "cotizada",
  ACCEPTED: "aprobada",
  REJECTED: "cerrada",
  EXPIRED: "cerrada",
  CONVERTED: "convertida",
  CANCELLED: "cerrada",
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try {
    actor = await requireApiPermission("quotes.edit");
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTES_FORBIDDEN", "No tienes permiso para editar cotizaciones.", 403);
    return apiError("QUOTES_AUTH_UNAVAILABLE", "No se pudo validar el acceso a cotizaciones.", 503);
  }
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const rawStatus = input.workflowStatus ?? input.status;
  const workflowStatus = typeof rawStatus === "string" && (quoteWorkflowStatuses as readonly string[]).includes(rawStatus) ? rawStatus as QuoteWorkflowStatus : typeof rawStatus === "string" ? legacyQuoteStatus(rawStatus) : null;
  if (!workflowStatus) return apiError("INVALID_QUOTE_STATUS", "Estado de cotización inválido.", 400);
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 500) : "";
  if (workflowStatus === "CANCELLED" && !reason) return apiError("CANCELLATION_REASON_REQUIRED", "La cancelación requiere un motivo.", 400);
  try {
    const quote = await getDb().transaction(async (tx) => {
      const [before] = await tx.select().from(quotes).where(eq(quotes.id, id)).for("update").limit(1);
      if (!before) throw new Error("Cotización no encontrada.");
      const current = before.workflowStatus && (quoteWorkflowStatuses as readonly string[]).includes(before.workflowStatus) ? before.workflowStatus as QuoteWorkflowStatus : legacyQuoteStatus(before.status);
      if (!current) throw new Error("Estado actual de cotización inválido.");
      if (current !== workflowStatus && !canTransitionQuote(current, workflowStatus)) throw new Error(`Transición no permitida: ${current} → ${workflowStatus}.`);
      if (current === workflowStatus) return before;
      const now = new Date();
      const [after] = await tx.update(quotes).set({ status: legacyByWorkflow[workflowStatus], workflowStatus, cancellationReason: workflowStatus === "CANCELLED" ? reason : null, cancelledBy: workflowStatus === "CANCELLED" ? actor.userId : null, cancelledAt: workflowStatus === "CANCELLED" ? now : null, updatedAt: now }).where(eq(quotes.id, id)).returning();
      await tx.insert(quoteStatusHistory).values({ id: `qsh-${crypto.randomUUID()}`, quoteId: id, fromStatus: before.status, toStatus: after.status, changedBy: actor.userId, note: reason || null });
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "quote.workflow_status_changed", entityType: "quote", entityId: id, before: { status: before.status, workflowStatus: current }, after: { status: after.status, workflowStatus }, metadata: reason ? { reason } : null });
      return after;
    });
    return apiSuccess({ success: true, quote, workflowStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la cotización.";
    return apiError(message.includes("no encontrada") ? "QUOTE_NOT_FOUND" : "QUOTE_STATUS_NOT_CHANGED", message, message.includes("no encontrada") ? 404 : 409);
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("quotes.view");
    const { id } = await params;
    const detail = await getQuoteDetail(id);
    return detail ? apiSuccess(detail) : apiError("QUOTE_NOT_FOUND", "Cotización no encontrada.", 404);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTES_FORBIDDEN", "No tienes permiso para ver cotizaciones.", 403);
    return apiError("QUOTE_DETAIL_UNAVAILABLE", "No se pudo cargar la cotización.", 503);
  }
}
