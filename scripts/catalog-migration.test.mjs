import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const migrationPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../drizzle/0004_amused_blacklash.sql",
);

test("tracking_code migration backfills legacy quotes before enforcing NOT NULL", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /ADD COLUMN "tracking_code" text;/);
  assert.match(sql, /UPDATE "quotes" SET "tracking_code" = "id" WHERE "tracking_code" IS NULL;/);
  assert.match(sql, /ALTER COLUMN "tracking_code" SET NOT NULL/);
  assert.doesNotMatch(sql, /ADD COLUMN "tracking_code" text NOT NULL;/);
});
