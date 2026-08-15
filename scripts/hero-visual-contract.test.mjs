import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("hero: el asset editorial se encuadra para ocupar el bloque visual derecho", async () => {
  const source = await readFile(path.join(root, "src/components/home/Hero.tsx"), "utf8");

  assert.match(source, /coldpower-hero-products\.png/);
  assert.match(source, /lg:object-cover/);
  assert.match(source, /object-right/);
  assert.match(source, /lg:scale-110/);
  assert.match(source, /lg:origin-right/);
  assert.match(source, /overflow-hidden/);
});
