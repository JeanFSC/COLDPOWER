import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
for (const file of [
  "src/components/shared/BrandLogo.tsx",
  "src/components/shared/Reveal.tsx",
  "src/components/home/Hero.tsx",
  "src/app/globals.css",
]) assert.equal(existsSync(join(root, file)), true, file);
for (const file of [
  "public/brand/logo-coldpower-lockup.webp",
  "public/brand/logo-coldpower-lockup-light.webp",
  "public/images/home-espejo/hero-desktop.webp",
  "public/images/home-espejo/banner-navy.webp",
  "public/images/categories/refrigeracion.webp",
  "public/images/products/product-placeholder.webp",
]) {
  assert.equal(existsSync(join(root, file)), true, file);
  assert.ok(statSync(join(root, file)).size <= 250000, file + " should be optimized");
}
const publicRasterFiles = readdirSync(join(root, "public"), { recursive: true }).filter((file) => /\.(png|jpe?g|webp)$/i.test(String(file)));
for (const file of publicRasterFiles) assert.ok(statSync(join(root, "public", String(file))).size <= 250000, String(file));
assert.match(read("src/components/shared/BrandLogo.tsx"), /logo-coldpower-lockup\.webp/);
assert.match(read("src/components/home/Hero.tsx"), /priority/);
assert.match(read("src/app/globals.css"), /prefers-reduced-motion/);
assert.match(read("src/app/page.tsx"), /NewArrivalsSection|AssistanceSection/);
console.log("Phase 8 visual and asset readiness contract: PASS");
