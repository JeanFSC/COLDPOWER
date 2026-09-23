import { eq } from "drizzle-orm";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { promotions } from "@/db/operations-schema";
import { promotionApprovalChanges } from "@/lib/promotion-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("pricing.discount.approve"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("PROMOTION_APPROVAL_FORBIDDEN", "No tienes permiso para aprobar descuentos.", 403); return apiError("PROMOTION_APPROVAL_UNAVAILABLE", "No se pudo validar el acceso.", 503); }
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("PROMOTION_INVALID_JSON", "JSON inválido.", 400); }
  const decision = body && typeof body === "object" && (body as Record<string, unknown>).decision;
  if (decision !== "APPROVED" && decision !== "REJECTED") return apiError("PROMOTION_APPROVAL_INVALID", "La decisión debe ser APPROVED o REJECTED.", 400);
  try {
    const result = await getDb().transaction(async (tx) => {
      const [before] = await tx.select().from(promotions).where(eq(promotions.id, id)).limit(1);
      if (!before) throw new Error("PROMOTION_NOT_FOUND");
      const [after] = await tx.update(promotions).set(promotionApprovalChanges(decision, actor.userId)).where(eq(promotions.id, id)).returning();
      await tx.insert(auditLogs).values({ id: "audit-" + crypto.randomUUID(), actorId: actor.userId, actorRole: actor.role, action: decision === "APPROVED" ? "promotions.approved" : "promotions.rejected", entityType: "promotion", entityId: id, before, after, metadata: { decision } });
      return after;
    });
    return apiSuccess({ promotion: result });
  } catch (error) {
    if (error instanceof Error && error.message === "PROMOTION_NOT_FOUND") return apiError("PROMOTION_NOT_FOUND", "Promoción no encontrada.", 404);
    return apiError("PROMOTION_APPROVAL_FAILED", "No se pudo registrar la aprobación.", 409);
  }
}
