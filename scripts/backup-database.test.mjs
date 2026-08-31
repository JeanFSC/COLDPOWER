import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("el respaldo lógico de CP-025 existe y no expone secretos", () => {
  const scriptPath = path.join(root, "scripts", "backup-database.ts");
  assert.equal(fs.existsSync(scriptPath), true, "falta scripts/backup-database.ts");
  const source = fs.readFileSync(scriptPath, "utf8");
  for (const table of ["categories", "families", "brands", "products", "quotes", "quoteItems", "quoteStatusHistory", "quoteCarts"]) {
    assert.match(source, new RegExp(`\\b${table}\\b`), `el respaldo no incluye ${table}`);
  }
  assert.match(source, /["']tmp["']\s*,\s*["']backups["']/);
  assert.doesNotMatch(source, /console\.log\([^)]*(?:DATABASE_URL|NEON|SECRET|TOKEN)/i);
  assert.match(fs.readFileSync(path.join(root, "package.json"), "utf8"), /"db:backup"\s*:/);
});

test("un archivo de respaldo tiene metadatos, tablas y versión de esquema", () => {
  const source = fs.readFileSync(path.join(root, "scripts", "backup-database.ts"), "utf8");
  assert.match(source, /schemaVersion/);
  assert.match(source, /tables/);
  assert.match(source, /createdAt/);
  assert.match(source, /getDb\(\)/);
});
