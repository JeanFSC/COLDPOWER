import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, products } from "@/db/schema";
import { canTransitionPublication } from "@/lib/catalog-admin-contract";
import { evaluatePublication, isAuthorizedEditorialRole, type PublicationStatus } from "@/lib/publication-governance";

export type PublicationChange = { productId: string; status: PublicationStatus; actorId: string; actorRole: string; note?: string; editorialDescription?: string | null; approveReview?: boolean };

export async function changePublicationStatus(change: PublicationChange) {
  if (!isAuthorizedEditorialRole(change.actorRole)) throw new Error("El rol no puede publicar el catálogo.");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [product] = await tx.select({ id: products.id, sku: products.sku, normalizedName: products.normalizedName, originalName: products.originalName, productType: products.productType, sourceStatus: products.status, publicationStatus: products.publicationStatus, requiresReview: products.requiresReview, reviewReason: products.reviewReason, possibleDuplicate: products.possibleDuplicate, editorialDescription: products.editorialDescription }).from(products).where(eq(products.id, change.productId)).limit(1);
    if (!product) throw new Error("Producto no encontrado.");
    if (product.publicationStatus === change.status) return { productId: product.id, sku: product.sku, status: change.status, decision: evaluatePublication({ ...product, publicationStatus: change.status, isCommercialLine: Boolean(product.productType.trim()) }), idempotent: true };
    if (!canTransitionPublication(product.publicationStatus, change.status)) throw new Error("CATALOG_PUBLICATION_INVALID");
    const nextRequiresReview = change.approveReview ? false : product.requiresReview;
    const nextDescription = change.editorialDescription === undefined ? product.editorialDescription : change.editorialDescription;
    const decision = evaluatePublication({ ...product, publicationStatus: change.status, requiresReview: nextRequiresReview, editorialDescription: nextDescription, isCommercialLine: Boolean(product.productType.trim()) });
    if (change.status === "published" && !decision.public) throw new Error(`No se puede publicar ${product.sku}: ${decision.reasons.join("; ")}`);
    const before = { publicationStatus: product.publicationStatus, requiresReview: product.requiresReview, reviewReason: product.reviewReason, editorialDescription: product.editorialDescription };
    const values: Partial<typeof products.$inferInsert> = { publicationStatus: change.status, publicationChangedAt: new Date(), publicationChangedBy: change.actorId, publicationNote: change.note ?? null };
    if (change.editorialDescription !== undefined) values.editorialDescription = change.editorialDescription;
    if (change.approveReview) values.requiresReview = false;
    await tx.update(products).set(values).where(eq(products.id, product.id));
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: change.actorId, actorRole: change.actorRole, action: "PRODUCT_PUBLICATION_CHANGED", entityType: "product", entityId: product.id, before, after: { publicationStatus: change.status, requiresReview: values.requiresReview ?? product.requiresReview, reviewReason: values.reviewReason ?? product.reviewReason, editorialDescription: values.editorialDescription ?? product.editorialDescription }, metadata: { note: change.note ?? null, reasons: decision.reasons } });
    return { productId: product.id, sku: product.sku, status: change.status, decision };
  });
}
