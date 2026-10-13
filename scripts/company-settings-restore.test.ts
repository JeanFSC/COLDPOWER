import assert from "node:assert/strict";
import test from "node:test";
import { assertCompanySettingsRestorePermissions, CompanySettingsRestorePermissionError } from "../src/lib/company-settings-restore-permissions";
import { invalidateRuntimeCache, withRuntimeCache } from "../src/lib/runtime-cache";

test("restauración rechaza cambios fiscales o de publicación sin permiso", () => {
  for (const role of ["GERENCIA", "ADMIN", "OPERACIONES_VENTAS"] as const) {
    assert.throws(() => assertCompanySettingsRestorePermissions(role, { taxRate: null, taxMode: null }, { taxRate: "18.00", taxMode: "INCLUDED" }), error => error instanceof CompanySettingsRestorePermissionError && error.code === "COMPANY_SETTINGS_TAX_FORBIDDEN");
    assert.throws(() => assertCompanySettingsRestorePermissions(role, { taxRate: "18.00", taxMode: "INCLUDED" }, { taxRate: null, taxMode: null }), error => error instanceof CompanySettingsRestorePermissionError && error.code === "COMPANY_SETTINGS_TAX_FORBIDDEN");
    for (const current of [true, false]) assert.throws(() => assertCompanySettingsRestorePermissions(role, { legalPagesPublished: current }, { legalPagesPublished: !current }), error => error instanceof CompanySettingsRestorePermissionError && error.code === "COMPANY_SETTINGS_LEGAL_PUBLISH_FORBIDDEN");
  }
});

test("restauración descriptiva conserva campos protegidos y SUPERADMIN puede cambiarlos", () => {
  assert.doesNotThrow(() => assertCompanySettingsRestorePermissions("GERENCIA", { taxRate: "18.00", taxMode: "INCLUDED", legalPagesPublished: true }, { taxRate: "18", taxMode: "INCLUDED", legalPagesPublished: true, hours: "QA AUDITORÍA" }));
  assert.doesNotThrow(() => assertCompanySettingsRestorePermissions("GERENCIA", { taxMode: "UNCONFIGURED", taxRate: null }, { taxMode: null, taxRate: null }));
  assert.doesNotThrow(() => assertCompanySettingsRestorePermissions("SUPERADMIN", null, { taxRate: "18.00", taxMode: "INCLUDED", legalPagesPublished: true }));
});

test("invalidación usada al restaurar elimina caché pública y fiscal", async () => {
  const options = { enabled: true, ttlMs: 60_000 };
  const other = `qa-settings-other-${crypto.randomUUID()}`;
  try {
    invalidateRuntimeCache("company-settings:");
    assert.equal(await withRuntimeCache("company-settings:public", async () => "antes", options), "antes");
    assert.equal(await withRuntimeCache("company-settings:tax", async () => "antes", options), "antes");
    await withRuntimeCache(other, async () => "conservar", options);
    invalidateRuntimeCache("company-settings:");
    assert.equal(await withRuntimeCache("company-settings:public", async () => "restaurado", options), "restaurado");
    assert.equal(await withRuntimeCache("company-settings:tax", async () => "restaurado", options), "restaurado");
    assert.equal(await withRuntimeCache(other, async () => "nuevo", options), "conservar");
  } finally { invalidateRuntimeCache("company-settings:"); invalidateRuntimeCache(other); }
});
