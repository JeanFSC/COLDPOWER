import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("CP-050 /dashboard no deja una ruta funcional duplicada", () => {
  const file = path.join(root, "src", "app", "dashboard", "page.tsx");
  assert.equal(fs.existsSync(file), true);
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /redirect\(/);
  assert.match(source, /auth\/after-sign-in/);
});
