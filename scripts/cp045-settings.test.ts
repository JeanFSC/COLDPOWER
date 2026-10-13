import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { publicCompanySettings, toCompanySettingsAdminResponse } from "../src/lib/company-settings";
import { validateCompanySettingsInput } from "../src/lib/company-settings-validation";

const root = process.cwd();
const read = (file: string) => readFileSync(`${root}/${file}`, "utf8");

test("restaurar configuración valida campos protegidos e invalida caché interna", () => {
  const route = read("src/app/api/admin/configuracion/restaurar/route.ts");
  assert.match(route, /assertCompanySettingsRestorePermissions\(actor.role, current, candidate\)/);
  assert.ok(route.indexOf("assertCompanySettingsRestorePermissions(actor.role, current, candidate)") < route.indexOf("tx.update(companySettings)"));
  assert.match(route, /invalidateRuntimeCache\("company-settings:"\)/);
  assert.match(route, /CompanySettingsRestorePermissionError/);
});

test("configuración: locales no se truncan a cinco registros", () => {
  const page = read("src/app/admin/configuracion/page.tsx");
  const locationsQuery = page.split("db.select({ id: locations.id")[1]?.split("\n")[0];
  assert.ok(locationsQuery);
  assert.doesNotMatch(locationsQuery, /\.limit\(/);
  assert.match(locationsQuery, /locations\.id\)/);
});

test("configuración: creación, actualización y validación", () => {
  const input = validateCompanySettingsInput({ country: "PE", ruc: "20123456786", email: " contacto@coldpower.pe ", website: "https://coldpower.pe", locations: [{ name: "Lima", address: "Av. 1" }, { name: "Arequipa" }], legalLinks: { privacy: "https://coldpower.pe/privacidad" } });
  assert.equal(input.email, "contacto@coldpower.pe");
  assert.equal(input.locations?.length, 2);
  assert.throws(() => validateCompanySettingsInput({ country: "PE", ruc: "123" }));
  assert.throws(() => validateCompanySettingsInput({ email: "no-es-correo" }));
  assert.throws(() => validateCompanySettingsInput({ website: "javascript:alert(1)" }));
  assert.throws(() => validateCompanySettingsInput({ locations: [{ name: "Lima" }, { name: " lima " }] }));
  assert.throws(() => validateCompanySettingsInput({ socials: { apiKey: "https://example.com/secret" } }));
});

test("configuración: separación pública y administrativa", () => {
  const response = toCompanySettingsAdminResponse({ legalName: "ColdPower S.A.C.", ruc: "20123456786", commercialName: "ColdPower", version: 4, validationStatus: "VALID", updatedBy: "u1", updatedAt: new Date("2026-01-01"), website: "https://coldpower.pe" });
  assert.equal(response.version, 4);
  assert.equal(response.administrative.ruc, "20123456786");
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
