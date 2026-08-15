export const publicationStatuses = ["draft", "review", "published", "hidden", "archived"] as const;
export type PublicationStatus = (typeof publicationStatuses)[number];
export const editorialWorkflowStates = ["IMPORTED", "IN_REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "ARCHIVED"] as const;
export type EditorialWorkflowState = (typeof editorialWorkflowStates)[number];
export const availabilityStatuses = ["unknown", "in_stock", "low_stock", "out_of_stock", "on_request"] as const;
export type AvailabilityStatus = (typeof availabilityStatuses)[number];
export const editorialRoles = ["SUPERADMIN", "GERENCIA", "OPERACIONES_VENTAS", "JEFATURA", "admin"] as const;
export type EditorialRole = (typeof editorialRoles)[number];

export type PublicationProduct = { id?: string; sku: string; normalizedName: string; originalName: string; productType: string; sourceStatus: string | null | undefined; publicationStatus: PublicationStatus; requiresReview?: boolean | null; reviewReason?: string | null; possibleDuplicate?: boolean | null; duplicateDecision?: "pending" | "different" | "confirmed" | "keep_both" | null; editorialDescription?: string | null; isCommercialLine?: boolean };
export type PublicationDecision = { public: boolean; indexable: boolean; reasons: string[] };
const minimumDescriptionLength = 24;

/**
 * The persisted catalog keeps the stable editorial enum used by the admin
 * API. This additive projection exposes the business vocabulary without
 * duplicating state in the database:
 * draft=IMPORTED, review+requiresReview=IN_REVIEW,
 * review+!requiresReview=APPROVED, hidden=REJECTED.
 */
export function getEditorialWorkflowState(product: Pick<PublicationProduct, "publicationStatus" | "requiresReview">): EditorialWorkflowState {
  if (product.publicationStatus === "archived") return "ARCHIVED";
  if (product.publicationStatus === "published") return "PUBLISHED";
  if (product.publicationStatus === "hidden") return "REJECTED";
  if (product.publicationStatus === "review" && product.requiresReview === false) return "APPROVED";
  if (product.publicationStatus === "review") return "IN_REVIEW";
  return "IMPORTED";
}

export function evaluatePublication(product: PublicationProduct): PublicationDecision {
  const reasons: string[] = [];
  if (product.publicationStatus !== "published") reasons.push(`Estado editorial: ${product.publicationStatus}`);
  if (!isActiveSource(product.sourceStatus)) reasons.push("Origen inactivo");
  if (product.requiresReview) reasons.push(product.reviewReason?.trim() || "Revisión editorial pendiente");
  const duplicateResolvedAsDifferent = product.duplicateDecision === "different" || product.duplicateDecision === "keep_both";
  if (product.possibleDuplicate && !duplicateResolvedAsDifferent) reasons.push("Posible duplicado pendiente de decisión");
  if (product.isCommercialLine === false) reasons.push("Fuera de las líneas comerciales principales");
  if (!hasSufficientDescription(product.editorialDescription)) reasons.push("Descripción insuficiente");
  return { public: reasons.length === 0, indexable: reasons.length === 0, reasons };
}
export function isPubliclyIndexable(product: PublicationProduct) { return evaluatePublication(product).indexable; }
export function isAuthorizedEditorialRole(role: string | null | undefined): role is EditorialRole { return typeof role === "string" && (editorialRoles as readonly string[]).includes(role); }
export function hasSufficientDescription(description: string | null | undefined) { return typeof description === "string" && description.trim().length >= minimumDescriptionLength; }
export function isActiveSource(status: string | null | undefined) { const normalized = status?.trim().toLowerCase(); return normalized === "activo" || normalized === "active"; }
export function getAvailabilityLabel(status: AvailabilityStatus | null | undefined) { switch (status) { case "in_stock": return "Disponible para consultar"; case "low_stock": return "Disponibilidad limitada; consultar"; case "out_of_stock": return "Agotado; consultar alternativa"; case "on_request": return "Bajo pedido"; case "unknown": default: return "Consultar disponibilidad"; } }
