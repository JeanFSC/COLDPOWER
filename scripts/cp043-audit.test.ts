import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { auditSeverity, AuditInvalidFilterError, parseAuditFilters } from "../src/lib/audit-contract";

const root = process.cwd();
const read = (file: string) => readFileSync(`${root}/${file}`, "utf8");

test("auditoria: filtros, fechas y paginación son válidos", () => {
  const parsed = parseAuditFilters(new URLSearchParams("query=payment&page=2&pageSize=50&dateFrom=2026-01-01&dateTo=2026-01-31"));
  assert.equal(parsed.query, "payment");
  assert.equal(parsed.page, 2);
  assert.equal(parsed.pageSize, 50);
  assert.throws(() => parseAuditFilters(new URLSearchParams("dateFrom=2026-02-02&dateTo=2026-02-01")), AuditInvalidFilterError);
  assert.throws(() => parseAuditFilters(new URLSearchParams("pageSize=0")), AuditInvalidFilterError);
});

test("auditoria: severidad y protección de datos sensibles", () => {
  assert.equal(auditSeverity("access.user_role_changed"), "CRITICAL");
  assert.equal(auditSeverity("auth.login_failed"), "WARNING");
  assert.equal(auditSeverity("catalog.product_read"), "INFO");
  assert.match(read("src/app/api/admin/auditoria/[id]/route.ts"), /audit\.sensitive\.view/);
  assert.match(read("src/app/api/admin/auditoria/export/route.ts"), /REDACTED/);
});

test("auditoria: contrato append-only, permisos y exportación existen", () => {
  for (const file of [
    "src/app/api/admin/auditoria/route.ts",
    "src/app/api/admin/auditoria/[id]/route.ts",
    "src/app/api/admin/auditoria/export/route.ts",
    "src/lib/audit-repository.ts",
    "src/lib/audit-contract.ts",
  ]) assert.equal(existsSync(`${root}/${file}`), true, file);
  assert.match(read("drizzle/0026_cp043_audit_append_only.sql"), /prevent_audit_log_mutation/);
  assert.match(read("drizzle/0026_cp043_audit_append_only.sql"), /BEFORE UPDATE OR DELETE/);
  assert.match(read("src/app/admin/auditoria/page.tsx"), /getAuditPage/);
  assert.doesNotMatch(read("src/app/admin/auditoria/page.tsx"), /quoteStatusHistory/);
  assert.match(read("src/app/api/admin/auditoria/route.ts"), /audit\.view/);
  assert.match(read("src/app/api/admin/auditoria/export/route.ts"), /audit\.export/);
  assert.match(read("src/app/api/admin/auditoria/export/route.ts"), /audit\.exported/);
});
