import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const contact = read("src/app/contacto/page.tsx");
const account = read("src/app/cuenta/page.tsx");
const complaints = read("src/app/libro-de-reclamaciones/page.tsx");

test("public pages expose honest recovery and legal channels", () => {
  assert.match(contact, /getPublicCompanySettings|ContactPage/);
  assert.match(account, /Historial|pedidos|cotizaciones/);
  assert.match(complaints, /ComplaintsForm/);
  assert.doesNotMatch(complaints, /próximamente|pendiente de habilitación|por implementar/i);
});

