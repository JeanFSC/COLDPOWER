import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("home hero preserves the current approved visual and commercial CTAs", () => {
  const source = read("src/components/home/Hero.tsx");
  assert.match(source, /home-v2-hero-hvac\.webp/);
  assert.match(source, /href="\/cotizacion"/);
  assert.match(source, /href="\/catalogo"/);
  assert.match(source, /priority/);
  assert.match(source, /overflow-hidden/);
  assert.equal(existsSync(join(root, "public/images/home/home-v2-hero-hvac.webp")), true);
});
