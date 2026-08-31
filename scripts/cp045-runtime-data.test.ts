import assert from "node:assert/strict";
import test from "node:test";
import { getPublicCompanySettings } from "../src/lib/company-settings-runtime";

test("configuración: lectura pública real siempre devuelve estructura permitida", async () => {
  const settings = await getPublicCompanySettings();
  assert.equal(typeof settings, "object");
  assert.equal("version" in settings, false);
  assert.equal("updatedBy" in settings, false);
});
