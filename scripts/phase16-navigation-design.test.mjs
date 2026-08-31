import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

assert.equal(existsSync(join(root, "public/brand/logo-coldpower.png")), true, "official logo should be public");
assert.equal(existsSync(join(root, "src/components/layout/TechnicalNav.tsx")), true, "technical nav should exist");

const css = read("src/app/globals.css");
for (const token of [
  "--brand-primary-900: #0B2239",
  "--brand-secondary-600: #0F6FAE",
  "--action-accent-500: #F59E0B",
  "--surface-page: #F4F7F9",
  "--border-default: #D7E0E7",
]) {
  assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${token} should be defined`);
}

const layout = read("src/app/layout.tsx");
assert.match(layout, /IBM Plex Sans|IBM_Plex_Sans/, "layout should load IBM Plex Sans");
assert.match(layout, /IBM Plex Mono|IBM_Plex_Mono/, "layout should load IBM Plex Mono");

const logo = read("src/components/shared/BrandLogo.tsx");
assert.match(logo, /logo-coldpower\.png/, "BrandLogo should use the official logo asset");

const header = read("src/components/layout/Header.tsx");
assert.match(header, /TechnicalNav/, "Header should render the technical navigation");
assert.match(header, /Busca por c[óo]digo, modelo, marca o especificaci[óo]n/, "search should use the technical placeholder");
assert.match(header, /Comparar|comparador/i, "header should expose comparison access");

console.log("Phase 16 navigation and design foundation: PASS");
