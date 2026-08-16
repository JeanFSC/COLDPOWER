import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionPublication, publicationStatusLabels, publicationStatuses } from "@/lib/catalog-admin-contract";
import { editorialWorkflowStates, evaluatePublication, getEditorialWorkflowState, publicationStatuses as governanceStatuses } from "@/lib/publication-governance";

test("CP-050 el catálogo conserva el estado ARCHIVED y lo excluye del público", () => {
  assert.equal(publicationStatuses.includes("archived"), true);
  assert.equal(governanceStatuses.includes("archived"), true);
  assert.equal(publicationStatusLabels.archived, "Archivado");
  assert.equal(canTransitionPublication("published", "archived"), true);
  assert.equal(canTransitionPublication("archived", "published"), false);
  assert.equal(evaluatePublication({
    sku: "CP-050-ARCHIVED",
    normalizedName: "Producto archivado",
    originalName: "Producto archivado",
    productType: "repuesto",
    sourceStatus: "activo",
    publicationStatus: "archived",
    requiresReview: false,
    possibleDuplicate: false,
    editorialDescription: "Descripción editorial suficiente para la ficha técnica.",
  }).public, false);
});

test("CP-050 proyecta el flujo de negocio sin duplicar el estado persistido", () => {
  assert.deepEqual(editorialWorkflowStates, ["IMPORTED", "IN_REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "ARCHIVED"]);
  assert.equal(getEditorialWorkflowState({ publicationStatus: "draft", requiresReview: true }), "IMPORTED");
  assert.equal(getEditorialWorkflowState({ publicationStatus: "review", requiresReview: true }), "IN_REVIEW");
  assert.equal(getEditorialWorkflowState({ publicationStatus: "review", requiresReview: false }), "APPROVED");
  assert.equal(getEditorialWorkflowState({ publicationStatus: "published", requiresReview: false }), "PUBLISHED");
  assert.equal(getEditorialWorkflowState({ publicationStatus: "hidden", requiresReview: false }), "REJECTED");
  assert.equal(getEditorialWorkflowState({ publicationStatus: "archived", requiresReview: false }), "ARCHIVED");
});

test("CP-050 conserva reviewReason importado al aprobar una publicación", () => {
  const service = readFileSync(new URL("../src/lib/publication-service.ts", import.meta.url), "utf8");
  assert.doesNotMatch(service, /values\.reviewReason\s*=\s*null/);
});
