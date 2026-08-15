import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditLogs, mediaAssetUsages, mediaAssets, products } from "@/db/schema";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("catalog.product.edit");
    const { id } = await params;
    const body = await request.json();
    const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const assetId = typeof value.assetId === "string" ? value.assetId.trim() : "";
    const slot = typeof value.slot === "string" && value.slot.trim() ? value.slot.trim().slice(0, 40) : "primary";
    const sortOrder = Number.isInteger(value.sortOrder) ? Number(value.sortOrder) : 0;
    if (!assetId) return apiError("CATALOG_VALIDATION_ERROR", "assetId es obligatorio.", 400);
    const result = await getDb().transaction(async (tx) => {
      const [product] = await tx.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
      const [asset] = await tx.select({ id: mediaAssets.id, status: mediaAssets.status, deletedAt: mediaAssets.deletedAt }).from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1);
      if (!product) throw new Error("CATALOG_PRODUCT_NOT_FOUND");
      if (!asset || asset.status !== "ACTIVE" || asset.deletedAt) throw new Error("CATALOG_MEDIA_INVALID");
      const [usage] = await tx.insert(mediaAssetUsages).values({ id: `usage-${crypto.randomUUID()}`, assetId, entityType: "product", entityId: id, slot, sortOrder }).onConflictDoUpdate({ target: [mediaAssetUsages.assetId, mediaAssetUsages.entityType, mediaAssetUsages.entityId, mediaAssetUsages.slot], set: { sortOrder } }).returning();
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "PRODUCT_MEDIA_ASSOCIATED", entityType: "product", entityId: id, before: null, after: { assetId, slot, sortOrder }, metadata: null });
      return usage;
    });
    return NextResponse.json({ usage: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CATALOG_FORBIDDEN", "No tienes permiso para editar media.", 403);
    const message = error instanceof Error ? error.message : "No se pudo asociar la media.";
    if (message === "CATALOG_PRODUCT_NOT_FOUND") return apiError(message, "Producto no encontrado.", 404);
    if (message === "CATALOG_MEDIA_INVALID") return apiError(message, "La media no está activa o no existe.", 400);
    return apiError("CATALOG_UNAVAILABLE", message, 409);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("catalog.product.edit");
    const { id } = await params;
    const assetId = new URL(request.url).searchParams.get("assetId")?.trim();
    if (!assetId) return apiError("CATALOG_VALIDATION_ERROR", "assetId es obligatorio.", 400);
    const result = await getDb().transaction(async (tx) => {
      const [usage] = await tx.delete(mediaAssetUsages).where(and(eq(mediaAssetUsages.entityType, "product"), eq(mediaAssetUsages.entityId, id), eq(mediaAssetUsages.assetId, assetId))).returning({ id: mediaAssetUsages.id, assetId: mediaAssetUsages.assetId });
      if (!usage) throw new Error("CATALOG_MEDIA_NOT_FOUND");
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "PRODUCT_MEDIA_REMOVED", entityType: "product", entityId: id, before: usage, after: null, metadata: null });
      return usage;
    });
    return NextResponse.json({ usage: result });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CATALOG_FORBIDDEN", "No tienes permiso para editar media.", 403);
    if (error instanceof Error && error.message === "CATALOG_MEDIA_NOT_FOUND") return apiError("CATALOG_MEDIA_NOT_FOUND", "La media no está asociada al producto.", 404);
    return apiError("CATALOG_UNAVAILABLE", "No se pudo quitar la media.", 409);
  }
}
