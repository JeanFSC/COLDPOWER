import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

const copyFiles = {
  "src/app/cotizacion/page.tsx": [
    "Solicitar cotizacion",
    "solicitud de cotizacion",
    "Las cotizaciones estan",
    'eyebrow="Cotizacion"',
    "Solicita una cotizacion",
    "validara compatibilidad",
  ],
  "src/components/quote/QuoteSummary.tsx": ["Que repuesto necesitas?", "validara compatibilidad", "descripcion general"],
  "src/components/quote/QuoteForm.tsx": [
    "refrigeracion.",
    "catalogo. Reintenta la busqueda",
    "No encontre mi producto",
    "11 digitos",
    "8 digitos",
    "Nombre o razon social",
    'label="Telefono"',
    "Llamada telefonica",
    "Correo electronico",
    "Producto de interes",
    "Se enviara como consulta general",
    "solicitud de cotizacion",
    "quedara registrada",
  ],
  "src/app/cuenta/cotizaciones/page.tsx": [
    "solicitudes de cotizacion",
    "En evaluacion",
    "Requiere informacion",
    "Aqui puedes",
    "ultima actualizacion",
    "Todavia no",
    "Ultima actualizacion",
    "Ubicacion",
  ],
  "src/app/buscar/page.tsx": ["atributos tecnicos", "Busqueda tecnica", "o categoria para"],
  "src/app/catalogo/page.tsx": ['title: "Catalogo tecnico"'],
  "src/components/catalog/MobileFilterDrawer.tsx": ["Filtrar catalogo"],
  "src/components/catalog/CatalogUnavailable.tsx": ["El catalogo esta", "Catalogo no disponible", "ayuda tecnica"],
  "src/app/not-found.tsx": ["Imagen referencial"],
};

for (const [relativePath, forbidden] of Object.entries(copyFiles)) {
  const source = read(relativePath);
  for (const phrase of forbidden) {
    assert.equal(source.includes(phrase), false, `${relativePath} conserva copy visible sin corregir: ${phrase}`);
  }
}

const technicalIdentity = read("src/components/product/TechnicalIdentity.tsx");
assert.equal(technicalIdentity.includes("Estado fuente:"), false, "La identidad pública no debe mostrar el estado fuente.");
assert.equal(technicalIdentity.includes("sourceStatus"), false, "La identidad pública no debe proyectar sourceStatus.");
assert.match(read("src/components/product/TransactionBox.tsx"), /Bajo consulta/);
assert.match(read("src/lib/unit-of-measure.ts"), /"UNIDAD \(BIENES\)": "Unidad"/);
assert.match(read("src/lib/unit-of-measure.ts"), /NIU: "Unidad"/);

console.log(`storefront-copy.test.mjs: ${Object.keys(copyFiles).length} archivos revisados, copy público y estados técnicos válidos.`);
