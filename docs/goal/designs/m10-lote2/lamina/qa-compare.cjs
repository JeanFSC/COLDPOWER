/* Internal visual comparison sheet for the design QA record. */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const lamina = __dirname;
const root = path.resolve(lamina, "..");
const referencePath = path.resolve(root, "..", "promociones", "promociones-desktop-1920x1080.png");
const desktopTargets = [
  "taxonomia-desktop-1920x1080.png",
  "detalle-producto-desktop-1920x1080.png",
  "detalle-proveedor-desktop-1920x1080.png",
  "configuracion-desktop-1920x1080.png",
];

function dataUrl(filePath) {
  return `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;
}

async function main() {
  const reference = dataUrl(referencePath);
  const rows = desktopTargets.map((name) => ({ name, image: dataUrl(path.join(root, name)) }));
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#eef2f6;color:#142238;font:14px Arial,sans-serif;padding:28px}
    h1{font-size:22px;margin:0 0 7px}p{margin:0 0 22px;color:#607894}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px}
    figure{margin:0;border:1px solid #dce6ee;border-radius:12px;background:#fff;padding:12px;box-shadow:0 1px 2px rgba(16,42,67,.05)}
    figcaption{font-weight:700;font-size:12px;margin-bottom:8px}img{display:block;width:100%;height:auto;border:1px solid #e8eef4}
  </style></head><body><h1>Comparación visual · M10 lote 2</h1><p>Fuente de shell aprobada a la izquierda; implementación de cada superficie a la derecha. Misma proporción desktop 1920 × 1080.</p>
  ${rows.map((row) => `<div class="row"><figure><figcaption>Fuente · Promociones aprobada</figcaption><img src="${reference}" alt="Fuente shell aprobada"></figure><figure><figcaption>${row.name}</figcaption><img src="${row.image}" alt="${row.name}"></figure></div>`).join("")}
  </body></html>`;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.screenshot({ path: path.join(lamina, "qa-desktop-comparison.png"), fullPage: true });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
