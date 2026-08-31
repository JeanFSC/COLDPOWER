import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { changeDuplicateDecision, duplicateDecisions, type DuplicateDecision } from "@/lib/duplicate-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("catalog.product.review");
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("CATALOG_VALIDATION_ERROR", "JSON inválido.", 400); }
    const input = (body && typeof body === "object" ? body : {}) as { decision?: unknown; canonicalProductId?: unknown; note?: unknown };
    if (typeof input.decision !== "string" || !(duplicateDecisions as readonly string[]).includes(input.decision)) return apiError("CATALOG_DUPLICATE_INVALID", "Decisión de duplicado inválida.", 400);
    const result = await changeDuplicateDecision({ productId: id, decision: input.decision as DuplicateDecision, canonicalProductId: typeof input.canonicalProductId === "string" ? input.canonicalProductId : null, note: typeof input.note === "string" ? input.note.slice(0, 500) : null, actorId: actor.userId, actorRole: actor.role });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CATALOG_FORBIDDEN", "No tienes permiso para revisar duplicados.", 403);
    const message = error instanceof Error ? error.message : "No se pudo guardar la decisión.";
    if (message === "CATALOG_DUPLICATE_INVALID") return apiError(message, "La decisión de duplicado no es válida.", 409);
    if (message.includes("no encontrado")) return apiError("CATALOG_PRODUCT_NOT_FOUND", message, 404);
    return apiError("CATALOG_UNAVAILABLE", message, 409);
  }
}
