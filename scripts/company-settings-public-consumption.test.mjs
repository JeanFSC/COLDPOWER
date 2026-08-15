import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const layout = read("src/app/layout.tsx");
const footer = read("src/components/layout/Footer.tsx");
const contact = read("src/app/contacto/page.tsx");
const quote = read("src/app/cotizacion/page.tsx");
const home = read("src/app/page.tsx");

assert.match(layout, /getPublicCompanySettings/);
assert.match(layout, /settings=\{publicSettings\}/);
assert.match(footer, /settings/);
assert.match(footer, /paymentMethods|legalLinks|locations/);
assert.match(contact, /getPublicCompanySettings/);
assert.match(contact, /settings/);
assert.match(quote, /getPublicCompanySettings/);
assert.match(quote, /companySettings|settings/);
assert.match(home, /getPublicCompanySettings/);
console.log("Company settings public consumption contract: PASS");
