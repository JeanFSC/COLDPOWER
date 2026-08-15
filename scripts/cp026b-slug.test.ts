import assert from "node:assert/strict";
import test from "node:test";
import { catalogSlugCandidates } from "@/lib/catalog-repository";

test("CP-026B resolves encoded and mojibake micro-sign slugs to the imported slug", () => {
  const canonical = "capacitor-25-µf-450-v-coldpower";
  assert.ok(catalogSlugCandidates("capacitor-25-%C2%B5f-450-v-coldpower").includes(canonical));
  assert.ok(catalogSlugCandidates("capacitor-25-Âµf-450-v-coldpower").includes(canonical));
});
