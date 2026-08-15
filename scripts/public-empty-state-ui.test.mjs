import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contact = fs.readFileSync("src/app/contacto/page.tsx", "utf8");
const account = fs.readFileSync("src/app/cuenta/page.tsx", "utf8");
const complaints = fs.readFileSync("src/app/libro-de-reclamaciones/page.tsx", "utf8");

test("public pages present incomplete configuration professionally", () => {
  assert.match(contact, /Canal pendiente de configuración/);
  assert.match(contact, /Se mostrará cuando la empresa complete sus datos comerciales/);
  assert.match(account, /Historial y recompra/);
  assert.match(account, /Productos comprados/);
  assert.match(account, /Repetir pedido/);
  assert.match(complaints, /Formulario legal pendiente de habilitación/);
  assert.match(complaints, /El canal formal todavía no está disponible/);
  assert.match(complaints, /secondaryHref="\/contacto"/);
});
