import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const typesPath = join(root, "src/types/catalog.ts");
const publicationPath = join(root, "src/lib/publication.ts");

assert.equal(existsSync(typesPath), true, "catalog.ts should define publication types");
assert.equal(existsSync(publicationPath), true, "publication.ts should define editorial gates");

const types = readFileSync(typesPath, "utf8");
const publication = readFileSync(publicationPath, "utf8");

for (const status of [
  "imported",
  "enrichment",
  "assisted-discovery",
  "publishable",
  "published",
  "suspended",
  "archived",
]) {
  assert.match(types, new RegExp(`['\"]${status}['\"]`), `catalog status ${status} should exist`);
}

for (const exportName of [
  "evaluateProductPublication",
  "getPublishedProducts",
  "getAssistedDiscoveryProducts",
]) {
  assert.match(
    publication,
    new RegExp(`export (?:function|const) ${exportName}`),
    `${exportName} should be exported from publication.ts`,
  );
}

for (const field of [
  "completenessScore",
  "publicationStatus",
  "reviewedBy",
  "verifiedAt",
  "isPublic",
]) {
  assert.match(publication, new RegExp(field), `publication contract should include ${field}`);
}

assert.match(publication, /MAX_COMPLETENESS_SCORE\s*=\s*100/);
console.log("Phase 15 catalog publication contract: PASS");
