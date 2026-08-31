import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("header follows the commercial reference structure", async () => {
  const [header, nav, mobile] = await Promise.all([
    read("src/components/layout/Header.tsx"),
    read("src/components/layout/TechnicalNav.tsx"),
    read("src/components/layout/MobileMenu.tsx"),
  ]);
  assert.match(header, /SearchBar/);
  assert.match(header, /Mi cuenta|Cuenta/);
  assert.match(header, /Cotizaci/);
  assert.match(nav, /Todas las categor/);
  assert.match(mobile, /aria-expanded|role="dialog"/);
});

test("footer remains compact and public", async () => {
  const footer = await read("src/components/layout/Footer.tsx");
  assert.match(footer, /Categor/);
  assert.match(footer, /Ayuda|Contacto/);
  assert.match(footer, /libro-de-reclamaciones/);
  assert.doesNotMatch(footer, /Tarjeta previa|Yape|Plin/);
});
