import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const css = read("src/app/globals.css");

assert.match(css, /\.home-hero-script \{[^}]*right: -1\.5rem;[^}]*width: 215px/);
assert.match(css, /\.home-hero h1 \{[^}]*font-size: clamp\(2\.45rem, 3\.6vw, 3\.9rem\)/);
assert.match(css, /\.home-hero-script \{ display: none; \}/);
assert.match(css, /\.home-hero-copy \{ position: relative;[^}]*background: linear-gradient/);
assert.match(css, /\.home-utility-whatsapp \{ display: none; \}/);
assert.match(css, /\.home-rail \{ display: grid; width: 100%; align-self: stretch;/);
assert.match(css, /\.home-header-logo \{ position: relative; width: 300px; height: 84px;/);
assert.match(css, /\.home-footer-brand > a \{ position: relative;[^}]*width: 260px/);
assert.match(read("src/components/layout/Header.tsx"), /BrandLogo size="lg" showTagline/);
assert.match(read("src/components/layout/Footer.tsx"), /BrandLogo variant="light" size="lg" showTagline/);
assert.match(read("src/components/shared/BrandLogo.tsx"), /SOLUCIONES EN REFRIGERACIÓN/);

console.log("Phase 18 home mirror round 2 contract: PASS");
