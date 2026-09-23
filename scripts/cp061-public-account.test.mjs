import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("CP-061 account page uses the redesigned customer-facing surface", () => {
  const page = read("src/app/cuenta/page.tsx");
  assert.match(page, /MI CUENTA/);
  assert.match(page, /Actividad reciente/);
  assert.match(page, /Carrito de cotización/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(page, /Acceso administrativo/);
  assert.doesNotMatch(page, /3 accesos relacionados/);
  assert.doesNotMatch(page, /No hay alertas nuevas/);
  assert.match(page, /account-hero-coldpower\.webp/);
});

test("CP-061 account data and profile mutation are ownership-scoped", () => {
  const service = read("src/lib/account-overview.ts");
  const route = read("src/app/api/cuenta/perfil/route.ts");
  assert.match(service, /eq\(customers\.userId, userId\)/);
  assert.match(service, /eq\(orders\.userId, userId\)/);
  assert.match(service, /customerQuoteLinks/);
  assert.match(service, /recentActivity: activities\.slice\(0, 5\)/);
  assert.match(route, /requireApiUser/);
  assert.match(route, /customer\.profile_updated/);
  assert.match(route, /customerAddresses/);
  assert.match(route, /perfil de cliente vinculado/);
  assert.doesNotMatch(route, /input\.customerId/);
  assert.doesNotMatch(route, /body\.customerId/);
  assert.doesNotMatch(route, /input\.email/);
});

test("CP-061 edit drawer and public footer keep real routes and honest states", () => {
  const editor = read("src/components/account/AccountProfileEditor.tsx");
  const footer = read("src/components/layout/Footer.tsx");
  assert.match(editor, /role="dialog"/);
  assert.match(editor, /\/api\/cuenta\/perfil/);
  assert.match(editor, /No se pudo actualizar/);
  assert.doesNotMatch(editor, /window\.alert|window\.prompt|location\.reload/);
  assert.match(footer, /Mi cuenta/);
  assert.match(footer, /cuenta\/cotizaciones/);
  assert.match(footer, /cuenta\/pedidos/);
  assert.match(footer, /cuenta\/carrito/);
  assert.match(footer, /cuenta\/pagos/);
  assert.match(footer, /Síguenos/);
  assert.doesNotMatch(footer, /paymentLabels|paymentMethods/);
});
