import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");
const page = read("src/app/contacto/page.tsx");
const component = read("src/components/contact/ContactPage.tsx");
const api = read("src/app/api/contacto/route.ts");
const footer = read("src/components/layout/Footer.tsx");

test("Contacto conserva la ruta pública y consume datos reales", () => {
  assert.match(page, /getPublicCompanySettings/);
  assert.match(page, /getCatalogBrands/);
  assert.match(page, /getPublishedMediaSlots/);
  assert.match(page, /contact-hero-coldpower\.webp/);
  assert.match(component, /href="\/cotizacion"/);
  assert.match(component, /href="#contact-form"/);
  assert.match(component, /fetch\("\/api\/contacto"/);
});

test("El endpoint público tiene persistencia, protección y archivos", () => {
  assert.match(api, /checkPublicRateLimit/);
  assert.match(api, /website/);
  assert.match(api, /validateContactAttachment/);
  assert.match(api, /createPublicContactLead/);
  assert.match(api, /notifyStaffOnce/);
});

test("El footer no concatena enums de pago sin traducir", () => {
  assert.doesNotMatch(footer, /settings\.paymentMethods\.join/);
  assert.match(footer, /CREDIT_CARD: "Tarjetas"/);
  assert.match(footer, /YAPE: "Yape"/);
});
