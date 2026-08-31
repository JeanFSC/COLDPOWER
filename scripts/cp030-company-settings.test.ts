import assert from "node:assert/strict";
import test from "node:test";
import { publicCompanySettings } from "../src/lib/company-settings";
import { validateCompanySettingsInput } from "../src/lib/company-settings-validation";

test("CP-030 conserva los campos empresariales tipados sin reutilizar valores entre campos", () => {
  const visible = publicCompanySettings({
    legalName: "ColdPower Servicios S.A.C.",
    tradeName: "ColdPower Pro",
    commercialName: "ColdPower",
    ruc: "20123456789",
    country: "Perú",
    department: "Lima",
    province: "Lima",
    district: "Surquillo",
    address: "Av. Principal 123",
    whatsapp: "+51911111111",
    phone: "+5112222222",
    salesEmail: "ventas@ejemplo.test",
    businessHours: "Lun-Vie 9:00-18:00",
    facebook: "https://facebook.com/real",
    instagram: "https://instagram.com/real",
    tiktok: "https://tiktok.com/@real",
    website: "https://ejemplo.test",
  });

  assert.equal(visible.legalName, "ColdPower Servicios S.A.C.");
  assert.equal(visible.tradeName, "ColdPower Pro");
  assert.equal(visible.commercialName, "ColdPower");
  assert.equal(visible.country, "Perú");
  assert.equal(visible.department, "Lima");
  assert.equal(visible.province, "Lima");
  assert.equal(visible.district, "Surquillo");
  assert.equal(visible.phone, "+5112222222");
  assert.equal(visible.salesEmail, "ventas@ejemplo.test");
  assert.equal(visible.businessHours, "Lun-Vie 9:00-18:00");
  assert.equal(visible.facebook, "https://facebook.com/real");
  assert.equal(visible.instagram, "https://instagram.com/real");
  assert.equal(visible.tiktok, "https://tiktok.com/@real");
  assert.equal(visible.website, "https://ejemplo.test");
  assert.deepEqual(visible.phones, ["+5112222222"]);
});

test("CP-030 valida y conserva el contrato tipado de company_settings", () => {
  const input = validateCompanySettingsInput({
    legalName: "Razón social",
    tradeName: "Marca legal",
    commercialName: "Nombre comercial",
    ruc: "20123456789",
    country: "Perú",
    department: "Lima",
    province: "Lima",
    district: "Miraflores",
    address: "Dirección real",
    whatsapp: "+51911111111",
    phone: "+5112222222",
    salesEmail: "ventas@ejemplo.test",
    businessHours: "Lun-Vie",
    facebook: "https://facebook.com/real",
    instagram: "https://instagram.com/real",
    tiktok: "https://tiktok.com/@real",
    website: "https://ejemplo.test",
  });

  assert.equal(input.tradeName, "Marca legal");
  assert.equal(input.salesEmail, "ventas@ejemplo.test");
  assert.equal(input.businessHours, "Lun-Vie");
  assert.equal(input.website, "https://ejemplo.test");
});
