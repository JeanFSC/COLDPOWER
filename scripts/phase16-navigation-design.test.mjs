import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
assert.equal(existsSync(join(root, "public/brand/logo-coldpower-lockup.webp")), true);
const css = read("src/app/globals.css");
for (const token of ["--brand-primary-900: #0B2239", "--brand-secondary-600: #0F6FAE", "--action-accent-500: #F59E0B", "--warning-dark: #7A4300"]) assert.ok(css.includes(token), token);
const layout = read("src/app/layout.tsx");
assert.match(layout, /next\/font\/google/);
assert.match(layout, /IBM_Plex_Sans/);
assert.match(layout, /IBM_Plex_Mono/);
const logo = read("src/components/shared/BrandLogo.tsx");
assert.match(logo, /logo-coldpower-lockup\.webp/);
const header = read("src/components/layout/Header.tsx");
for (const token of ["SearchBar", "QuoteListButton", "CartButton", "Mi cuenta", "isHome"]) assert.match(header, new RegExp(token));
assert.match(read("src/components/layout/AppChrome.tsx"), /Saltar al contenido/);
console.log("Phase 16 navigation and design foundation: PASS");

