import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("schema CP-030 conserva catálogo y agrega pricing/settings tipados", async () => {
  const schema = await read("src/db/schema.ts");
  assert.match(schema, /wholesaleMinQty/);
  assert.match(schema, /minimumAllowed/);
  assert.match(schema, /status: text\("status"/);
  for (const field of ["country", "department", "province", "district", "tradeName", "salesEmail", "businessHours", "facebook", "instagram", "tiktok", "website"]) assert.match(schema, new RegExp(field));
});

test("schema CP-030 separa customer CRM, intentos/evidencia de pago y estados operativos", async () => {
  const crm = await read("src/db/crm-schema.ts");
  const sales = await read("src/db/sales-schema.ts");
  const schema = await read("src/db/schema.ts");
  assert.match(crm, /customerContacts|customerNotes|customerAddresses/);
  assert.match(sales, /paymentAttempts|paymentEvidence/);
  assert.match(sales, /UNDER_REVIEW|CONFIRMED/);
  assert.match(sales, /RECEIVED|READY|IN_TRANSIT/);
  assert.match(schema, /cmsSections|cmsEntries|cmsRevisions/);
});

test("migration CP-030 es aditiva y tiene rollback documentado", async () => {
  const migration = await read("drizzle/0017_funny_mysterio.sql");
  const rollback = await read("docs/migrations/0017_cp030_inventory_catalog.rollback.sql");
  assert.match(migration, /ALTER TABLE|CREATE TABLE|ALTER TYPE/);
  assert.match(rollback, /rollback|drop|remove/i);
});
