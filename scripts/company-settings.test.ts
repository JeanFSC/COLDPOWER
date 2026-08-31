import assert from "node:assert/strict";
import test from "node:test";
import { emptyCompanySettings, publicCompanySettings } from "../src/lib/company-settings";

test("los datos empresariales faltantes se ocultan y no se reemplazan con fake", () => {
  const settings = emptyCompanySettings();
  const visible = publicCompanySettings(settings);
  assert.equal(visible.whatsapp, undefined);
  assert.equal(visible.email, undefined);
  assert.equal(visible.address, undefined);
  assert.doesNotMatch(JSON.stringify(visible), /999|00000000000|ventas@coldpower/i);
});

test("la configuración real conserva campos no vacíos", () => {
  const visible = publicCompanySettings({ commercialName: "ColdPower real", email: "contacto@ejemplo.test", phones: ["+51 900 123 456"] });
  assert.equal(visible.commercialName, "ColdPower real");
  assert.equal(visible.email, "contacto@ejemplo.test");
  assert.deepEqual(visible.phones, ["+51 900 123 456"]);
});
