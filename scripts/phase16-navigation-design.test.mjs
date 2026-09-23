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
assert.match(layout, /next\/font\/google/, "layout should load fonts through next/font/google");
assert.match(layout, /IBM_Plex_Sans/, "layout should configure IBM Plex Sans");
assert.match(layout, /IBM_Plex_Mono/, "layout should configure IBM Plex Mono");
assert.match(layout, /--font-ibm-plex-sans/, "layout should expose the IBM Plex Sans variable");
assert.match(layout, /--font-ibm-plex-mono/, "layout should expose the IBM Plex Mono variable");

const logo = read("src/components/shared/BrandLogo.tsx");
assert.match(logo, /logo-coldpower(?:-lockup)?\.png/, "BrandLogo should use the official logo asset");

const header = read("src/components/layout/Header.tsx");
assert.match(header, /TechnicalNav/, "Header should render the technical navigation");
assert.match(header, /Busca por c(?:ó|o)digo, modelo, marca o producto/, "search should use the technical placeholder");
assert.match(header, /Comparar|comparador/i, "header should expose comparison access");

console.log("Phase 16 navigation and design foundation: PASS");
