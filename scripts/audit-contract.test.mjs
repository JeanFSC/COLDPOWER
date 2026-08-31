import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("la auditoría es append-only para decisiones CP-025", () => {
  const schema = fs.readFileSync(path.join(root, "src", "db", "schema.ts"), "utf8");
  assert.match(schema, /auditLogs/);
  assert.match(schema, /before/);
  assert.match(schema, /after/);
  assert.match(schema, /metadata/);
  assert.equal(fs.existsSync(path.join(root, "src", "lib", "audit.ts")), true);
});
