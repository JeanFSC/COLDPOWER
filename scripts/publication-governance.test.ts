import assert from "node:assert/strict";
import test from "node:test";
import {
  availabilityStatuses,
  evaluatePublication,
  getAvailabilityLabel,
  isAuthorizedEditorialRole,
  isPubliclyIndexable,
  publicationStatuses,
  type PublicationProduct,
} from "../src/lib/publication-governance";

const validPublishedProduct: PublicationProduct = {
  sku: "CP-VALID-001",
  normalizedName: "Compresor validado",
  originalName: "Compresor validado",
  productType: "compresores",
  sourceStatus: "activo",
  publicationStatus: "published",
  requiresReview: false,
  possibleDuplicate: false,
  editorialDescription: "Compresor validado para aplicaciones comerciales. Consulta compatibilidad.",
};

test("CP-025 usa estados editoriales explícitos y disponibilidad desconocida", () => {
  assert.deepEqual(publicationStatuses, ["draft", "review", "published", "hidden", "archived"]);
  assert.deepEqual(availabilityStatuses, ["unknown", "in_stock", "low_stock", "out_of_stock", "on_request"]);
  assert.equal(getAvailabilityLabel("unknown"), "Consultar disponibilidad");
  assert.equal(getAvailabilityLabel(undefined), "Consultar disponibilidad");
  assert.notEqual(getAvailabilityLabel(undefined), "Bajo pedido");
});

test("el SKU de regresión no puede ser público aunque el estado editorial se fuerce", () => {
  const decision = evaluatePublication({
    ...validPublishedProduct,
    sku: "CP-REF-OTR-0435",
    normalizedName: "121",
    originalName: "121",
    publicationStatus: "published",
    requiresReview: true,
    reviewReason: "Descripción insuficiente",
    editorialDescription: null,
  });
  assert.equal(decision.public, false);
  assert.equal(decision.indexable, false);
  assert.match(decision.reasons.join(" | "), /Descripción insuficiente|revisi[oó]n/i);
});

test("la publicación válida sí pasa y los bloqueos de origen/editorial no", () => {
  assert.equal(isPubliclyIndexable(validPublishedProduct), true);
  assert.equal(evaluatePublication({ ...validPublishedProduct, sourceStatus: "inactivo" }).public, false);
  assert.equal(evaluatePublication({ ...validPublishedProduct, editorialDescription: null }).public, false);
  assert.equal(evaluatePublication({ ...validPublishedProduct, possibleDuplicate: true }).public, false);
  assert.equal(evaluatePublication({ ...validPublishedProduct, publicationStatus: "review" }).public, false);
});

test("solo roles editoriales autorizados pueden cambiar publicación", () => {
  assert.equal(isAuthorizedEditorialRole("SUPERADMIN"), true);
  assert.equal(isAuthorizedEditorialRole("JEFATURA"), true);
  assert.equal(isAuthorizedEditorialRole("VENTAS"), false);
  assert.equal(isAuthorizedEditorialRole("ALMACEN"), false);
});
