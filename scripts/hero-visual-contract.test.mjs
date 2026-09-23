import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("home hero uses the generated responsive technical image and search CTA", () => {
  const source = read("src/components/home/Hero.tsx");
  assert.match(source, /hero-tecnico-hvac\.webp/);
  assert.match(source, /hero-tecnico-hvac-mobile\.webp/);
  assert.match(source, /submitLabel="Buscar"/);
  assert.match(source, /overflow-hidden/);
  assert.equal(existsSync(join(root, "public/images/home/hero-tecnico-hvac.webp")), true);
});

