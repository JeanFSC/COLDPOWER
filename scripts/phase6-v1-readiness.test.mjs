import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
for (const file of [
  "src/app/nosotros/page.tsx",
  "src/app/contacto/page.tsx",
  "src/app/not-found.tsx",
  "src/components/shared/FinalCTA.tsx",
  "src/app/faq/page.tsx",
  "src/app/libro-de-reclamaciones/page.tsx",
]) assert.equal(existsSync(join(root, file)), true, file);
assert.match(read("src/app/nosotros/page.tsx"), /timeline|Cómo trabajamos/);
assert.match(read("src/app/contacto/page.tsx"), /getPublicCompanySettings|ContactPage/);
assert.match(read("src/app/not-found.tsx"), /SearchBar|categor/);
assert.match(read("src/app/faq/page.tsx"), /Preguntas frecuentes/);
assert.match(read("src/app/libro-de-reclamaciones/page.tsx"), /ComplaintsForm/);
for (const file of ["src/app/page.tsx", "src/components/home/Hero.tsx", "src/components/catalog/ProductCard.tsx", "src/app/contacto/page.tsx", "src/app/nosotros/page.tsx", "src/app/not-found.tsx"]) assert.doesNotMatch(read(file), /51900000000/);
console.log("Phase 6 public informational surfaces: PASS");

