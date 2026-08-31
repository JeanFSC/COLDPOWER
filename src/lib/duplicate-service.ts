import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, products } from "@/db/schema";
import { validateDuplicateDecision } from "@/lib/catalog-admin-contract";
import { isAuthorizedEditorialRole } from "@/lib/publication-governance";

export const duplicateDecisions = ["pending", "different", "confirmed", "keep_both"] as const;
export type DuplicateDecision = (typeof duplicateDecisions)[number];
export type DuplicateDecisionChange = { productId: string; decision: DuplicateDecision; canonicalProductId?: string | null; note?: string | null; actorId: string; actorRole: string };

export async function changeDuplicateDecision(change: DuplicateDecisionChange) {
  if (!isAuthorizedEditorialRole(change.actorRole)) throw new Error("El rol no puede resolver duplicados del catálogo.");
  try { validateDuplicateDecision(change); } catch { throw new Error("CATALOG_DUPLICATE_INVALID"); }
  const db = getDb();
  return db.transaction(async (tx) => {
    const [product] = await tx.select({ id: products.id, sku: products.sku, duplicateGroup: products.duplicateGroup, possibleDuplicate: products.possibleDuplicate, duplicateDecision: products.duplicateDecision, canonicalProductId: products.canonicalProductId }).from(products).where(eq(products.id, change.productId)).limit(1);
    if (!product) throw new Error("Producto no encontrado.");
    if (!product.duplicateGroup) throw new Error("El producto no pertenece a un grupo de duplicados.");
    let canonicalProductId: string | null = null;
    if (change.decision === "confirmed") {
      const requestedCanonicalProductId = change.canonicalProductId;
      if (!requestedCanonicalProductId) throw new Error("Una confirmación requiere seleccionar el producto canónico.");
      canonicalProductId = requestedCanonicalProductId;
      if (canonicalProductId === product.id) throw new Error("El producto canónico debe ser otra referencia del grupo.");
      const [canonical] = await tx.select({ id: products.id, duplicateGroup: products.duplicateGroup }).from(products).where(and(eq(products.id, canonicalProductId), eq(products.duplicateGroup, product.duplicateGroup))).limit(1);
      if (!canonical) throw new Error("El producto canónico debe pertenecer al mismo grupo de duplicados.");
    }
    const keepsDuplicateBlock = change.decision === "pending" || change.decision === "confirmed";
    await tx.update(products).set({ duplicateDecision: change.decision, canonicalProductId, possibleDuplicate: keepsDuplicateBlock, updatedAt: new Date() }).where(eq(products.id, product.id));
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: change.actorId, actorRole: change.actorRole, action: "PRODUCT_DUPLICATE_REVIEWED", entityType: "product", entityId: product.id, before: { possibleDuplicate: product.possibleDuplicate, duplicateDecision: product.duplicateDecision, canonicalProductId: product.canonicalProductId }, after: { possibleDuplicate: keepsDuplicateBlock, duplicateDecision: change.decision, canonicalProductId }, metadata: { duplicateGroup: product.duplicateGroup, sku: product.sku, note: change.note ?? null, massOperation: false } });
    return { productId: product.id, sku: product.sku, decision: change.decision, canonicalProductId };
  });
}
