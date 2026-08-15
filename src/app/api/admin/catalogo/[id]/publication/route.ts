import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { changePublicationStatus } from "@/lib/publication-service";
import { publicationStatuses, type PublicationStatus } from "@/lib/publication-governance";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("catalog.product.publish");
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("CATALOG_VALIDATION_ERROR", "JSON inválido.", 400); }
    const input = (body && typeof body === "object" ? body : {}) as { status?: unknown; note?: unknown; editorialDescription?: unknown; approveReview?: unknown };
    if (typeof input.status !== "string" || !(publicationStatuses as readonly string[]).includes(input.status)) return apiError("CATALOG_PUBLICATION_INVALID", "Estado editorial inválido.", 400);
    const result = await changePublicationStatus({ productId: id, status: input.status as PublicationStatus, actorId: actor.userId, actorRole: actor.role, note: typeof input.note === "string" ? input.note.slice(0, 500) : undefined, editorialDescription: input.editorialDescription === undefined ? undefined : typeof input.editorialDescription === "string" ? input.editorialDescription.slice(0, 2000) : null, approveReview: input.approveReview === true });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CATALOG_FORBIDDEN", "No tienes permiso para publicar el catálogo.", 403);
    const message = error instanceof Error ? error.message : "No se pudo actualizar la publicación.";
    if (message === "CATALOG_PUBLICATION_INVALID") return apiError(message, "La transición editorial no está permitida.", 409);
    if (message.includes("no encontrado")) return apiError("CATALOG_PRODUCT_NOT_FOUND", message, 404);
    return apiError("CATALOG_UNAVAILABLE", message, 409);
  }
}
