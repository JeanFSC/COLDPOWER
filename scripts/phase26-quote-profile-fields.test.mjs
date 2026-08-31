import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const quoteLib = read("src/lib/quote.ts");
const quoteForm = read("src/components/quote/QuoteForm.tsx");
const quoteSuccess = read("src/components/quote/QuoteSuccess.tsx");
const apiRoute = read("src/app/api/cotizacion/route.ts");
const schema = read("src/db/schema.ts");

for (const field of ["customerType", "documentNumber", "department", "province", "district", "preferredContact", "consent"]) {
  assert.match(quoteLib, new RegExp(field), `${field} should be part of the validated quote payload`);
  assert.match(quoteForm, new RegExp(field), `${field} should be rendered by QuoteForm`);
  assert.match(schema, new RegExp(field), `${field} should be persisted in the database schema`);
}

assert.match(quoteLib, /DNI|RUC/);
assert.match(quoteLib, /consent.*true|true.*consent/i);
assert.match(quoteForm, /preferred-contact|preferredContact/);
assert.match(quoteForm, /required/);
assert.match(quoteSuccess, /documentNumber|preferredContact/);
assert.match(apiRoute, /documentNumber|customerType/);
const migrations = readdirSync(join(root, "drizzle"));
assert.equal(migrations.some((file) => /^0002_.*\.sql$/.test(file)), true, "quote profile migration should exist");
assert.equal(existsSync(join(root, "drizzle/meta/0002_snapshot.json")), true, "quote profile snapshot should exist");

console.log("Phase 26 quote profile fields contract: PASS");
