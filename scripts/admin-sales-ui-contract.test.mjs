import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("gestionar cobros muestra todos los pagos de la venta sin elegir un provisional", async () => {
  const workspace = await read("src/components/admin/SalesControlCenter.tsx");
  assert.match(workspace, /href=\{`\/admin\/pagos\?saleId=\$\{encodeURIComponent\(String\(sale\.id\)\)\}`\}[^>]*>Gestionar cobros/);
  assert.doesNotMatch(workspace, /href=\{payments\[0\]\?\.id/);
  assert.match(await read("src/lib/payments-repository.ts"), /if \(filters\.saleId\) conditions\.push\(eq\(orders\.saleId, filters\.saleId\)\)/);
});

test("ventas, clientes, pedidos y compras: enlaces nativos de archivo conservan filtros", async () => {
  for (const [file, endpoint] of [
    ["SalesControlCenter.tsx", "ventas"],
    ["CustomersControlCenter.tsx", "clientes"],
    ["OrdersControlCenter.tsx", "pedidos"],
    ["AdminPurchasesModule.tsx", "compras"],
  ]) {
    const workspace = await read(`src/components/admin/${file}`);
    if (endpoint === "compras") {
      assert.match(workspace, /<a\s+href=\{exportHref\}\s+download/);
      const page = await read("src/app/admin/compras/page.tsx");
      assert.match(page, /exportHref=\{resolved\.exportHref\}/);
      const filters = await read("src/lib/purchases-page-filters.ts");
      assert.match(filters, /Object\.entries\(filters\)/);
      assert.match(filters, /\/api\/admin\/compras\/export/);
    } else assert.match(workspace, new RegExp(`<a\\s+href=\\{\\x60/api/admin/${endpoint}/export\\?\\$\\{queryString\\}\\x60\\}\\s+download`));
  }
});

test("ventas: los canales del flujo comercial tienen etiquetas visibles", async () => {
  const workspace = await read("src/components/admin/SalesControlCenter.tsx");
  for (const [code, label] of [["TELEFONO", "Teléfono"], ["LOCAL", "Tienda"], ["REFERIDO", "Referido"], ["CLIENTE_RECURRENTE", "Cliente recurrente"], ["OTRO", "Otro"]]) {
    assert.match(workspace, new RegExp(`${code}: "${label}"`));
  }
});

test("ventas: el centro vigente actualiza facturación y comunica errores", async () => {
  const page = await read("src/app/admin/ventas/page.tsx");
  const workspace = await read("src/components/admin/SalesControlCenter.tsx");

  assert.match(page, /SalesControlCenter/);
  assert.match(workspace, /api\/admin\/ventas\/\$\{encodeURIComponent\(saleId\)\}\/facturacion/);
  assert.match(workspace, /invoiceStatus/);
  assert.match(workspace, /role="alert"/);
});

test("ventas: las acciones rápidas navegan a operaciones reales", async () => {
  const workspace = await read("src/components/admin/SalesControlCenter.tsx");
  assert.match(workspace, /Ver por facturar|Facturación/);
  assert.match(workspace, /api\/admin\/ventas/);
});
