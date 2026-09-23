import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { publicCompanySettings, toCompanySettingsAdminResponse } from "../src/lib/company-settings";
import { validateCompanySettingsInput } from "../src/lib/company-settings-validation";

const root = process.cwd();
const read = (file: string) => readFileSync(`${root}/${file}`, "utf8");

test("configuración: creación, actualización y validación", () => {
  const input = validateCompanySettingsInput({ country: "PE", ruc: "20123456789", email: " contacto@coldpower.pe ", website: "https://coldpower.pe", locations: [{ name: "Lima", address: "Av. 1" }, { name: "Arequipa" }], legalLinks: { privacy: "https://coldpower.pe/privacidad" } });
  assert.equal(input.email, "contacto@coldpower.pe");
  assert.equal(input.locations?.length, 2);
  assert.throws(() => validateCompanySettingsInput({ country: "PE", ruc: "123" }));
  assert.throws(() => validateCompanySettingsInput({ email: "no-es-correo" }));
  assert.throws(() => validateCompanySettingsInput({ website: "javascript:alert(1)" }));
  assert.throws(() => validateCompanySettingsInput({ locations: [{ name: "Lima" }, { name: " lima " }] }));
  assert.throws(() => validateCompanySettingsInput({ socials: { apiKey: "https://example.com/secret" } }));
});

test("configuración: separación pública y administrativa", () => {
  const response = toCompanySettingsAdminResponse({ legalName: "ColdPower S.A.C.", ruc: "20123456789", commercialName: "ColdPower", version: 4, validationStatus: "VALID", updatedBy: "u1", updatedAt: new Date("2026-01-01"), website: "https://coldpower.pe" });
  assert.equal(response.version, 4);
  assert.equal(response.administrative.ruc, "20123456789");
  assert.equal(response.public.website, "https://coldpower.pe");
  assert.equal((response.public as Record<string, unknown>).version, undefined);
  assert.equal(publicCompanySettings({ phone: "  +51 900 000 000 " }).phone, "+51 900 000 000");
});

test("configuración: historial, restauración, concurrencia, caché, secretos, auditoría y RBAC", () => {
  for (const file of ["src/app/api/admin/configuracion/route.ts", "src/app/api/admin/configuracion/historial/route.ts", "src/app/api/admin/configuracion/restaurar/route.ts", "drizzle/0028_cp045_company_settings.sql"]) assert.equal(existsSync(`${root}/${file}`), true, file);
  const route = read("src/app/api/admin/configuracion/route.ts");
  assert.match(route, /settings\.business\.edit/);
  assert.match(route, /CompanySettingsConflictError/);
  assert.match(route, /companySettingsHistory/);
  assert.match(route, /revalidateTag/);
  assert.match(route, /version/);
  assert.match(read("src/app/api/admin/configuracion/restaurar/route.ts"), /company\.settings_restored/);
  assert.match(read("src/lib/company-settings-runtime.ts"), /validationStatus/);
  assert.match(read("src/lib/company-settings-validation.ts"), /secret|token|password/);
  assert.match(read("src/lib/company-settings-validation.ts"), /HTTP/);
});
