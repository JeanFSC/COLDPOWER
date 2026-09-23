import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

for (const file of [
  "src/app/admin/configuracion/page.tsx",
  "src/components/admin/CompanySettingsForm.tsx",
  "src/lib/company-settings-runtime.ts",
]) {
  assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
}

const page = read("src/app/admin/configuracion/page.tsx");
const form = read("src/components/admin/CompanySettingsForm.tsx");
const runtime = read("src/lib/company-settings-runtime.ts");
const layout = read("src/app/admin/layout.tsx");
const api = read("src/app/api/admin/configuracion/route.ts");

assert.match(page, /settings\.business\.edit/);
for (const field of ["legalName", "commercialName", "ruc", "whatsapp", "phones", "email", "address", "hours", "socials", "locations", "paymentMethods", "guaranteeTerms", "coverage", "legalLinks"]) {
  assert.match(form, new RegExp(field), `${field} should be editable from admin`);
}
assert.match(form, /\/api\/admin\/configuracion/);
assert.match(api, /company\.settings_updated/);
assert.match(runtime, /companySettings/);
assert.match(runtime, /publicCompanySettings/);
assert.match(layout, /\/admin\/configuracion/);
console.log("Company settings admin contract: PASS");
