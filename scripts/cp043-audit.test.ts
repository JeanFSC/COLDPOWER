import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { actionLabel, entityLabel, auditSeverity, AuditInvalidFilterError, parseAuditFilters } from "../src/lib/audit-contract";
import { auditExportSnapshot } from "../src/lib/audit-export";
import { resolveAuditPageFilters } from "../src/lib/audit-page-filters";

const root = process.cwd();
const read = (file: string) => readFileSync(`${root}/${file}`, "utf8");

test("auditoria: detalle y consultas auxiliares distinguen error de ausencia", () => {
  const page = read("src/app/admin/auditoria/page.tsx");
  const view = read("src/components/admin/AdminAuditModule.tsx");
  const controls = read("src/components/admin/AuditModuleControls.tsx");
  assert.match(page, /detailResult.error \?\? \(eventId && !selected/);
  assert.match(page, /El evento solicitado no existe/);
  assert.match(page, /savedFiltersError = savedFilterResult.error/);
  assert.match(page, /relatedEventsError = relatedResult.error/);
  assert.match(view, /detailError \? <>/);
  assert.match(view, /Volver al registro/);
  assert.match(view, /relatedEventsError \? <p role="alert"/);
  assert.match(controls, /unavailable \? <p role="alert"/);
});

test("auditoria: filtros inválidos se restablecen también para exportación", () => {
  const invalid = resolveAuditPageFilters(new URLSearchParams("dateFrom=2026-02-30&query=Jean&eventId=ignored"));
  assert.deepEqual(invalid.filters, {});
  assert.match(invalid.filterNotice ?? "", /se restablecieron/);
  assert.equal(invalid.baseQuery, "");
  assert.equal(invalid.exportHref, "/api/admin/auditoria/export");
  const valid = resolveAuditPageFilters(new URLSearchParams("q=Jean&page=999&pageSize=5&eventId=ignored&tab=cambios"));
  assert.equal(valid.baseQuery, "query=Jean&pageSize=5");
  assert.equal(valid.exportHref, "/api/admin/auditoria/export?query=Jean");
  assert.equal(valid.filters.page, 999);
});

test("auditoria: fallo de carga no se presenta como ausencia real", () => {
  const view = read("src/components/admin/AdminAuditModule.tsx");
  assert.match(view, /loadError \? "N\/D"/);
  assert.match(view, /loadError \? "Resultados no disponibles"/);
  assert.match(view, /No se pudo cargar el volumen de eventos/);
  assert.match(view, /loadError \? "El registro de auditoría no está disponible\."/);
});

test("auditoria: guardar filtro usa formulario accesible y comunica el resultado", () => {
  const controls = read("src/components/admin/AuditModuleControls.tsx");
  const save = controls.slice(controls.indexOf("export function SaveFilterButton("), controls.indexOf("export function SavedFiltersMenu("));
  assert.doesNotMatch(save, /window\.prompt/);
  assert.match(save, /aria-label="Guardar filtro de auditoría"/);
  assert.match(save, /required maxLength=\{80\}/);
  assert.match(save, /if \(running\.current\) return/);
  assert.match(save, /apiErrorMessage\(result\?\.error/);
  assert.match(save, /Revisa Más filtros antes de volver a intentarlo/);
  assert.match(save, /role=\{failed \? "alert" : "status"\}/);
  assert.match(save, /event\.key === "Escape"/);
});

test("auditoria: consulta la página efectiva y desactiva sus límites", () => {
  const service = read("src/lib/audit-repository.ts");
  const page = service.slice(service.indexOf("export async function getAuditPage("), service.indexOf("export async function getAuditDetail("));
  assert.ok(page.indexOf("Math.min(requestedPage, totalPages)") < page.indexOf(".offset((page - 1) * pageSize)"));
  const view = read("src/components/admin/AdminAuditModule.tsx");
  assert.match(view, /pagination.page <= 1 \? <span aria-label="Página anterior" aria-disabled="true"/);
  assert.match(view, /pagination.page >= pagination.totalPages \? <span aria-label="Página siguiente" aria-disabled="true"/);
  assert.match(view, /aria-current=\{page === pagination.page \? "page" : undefined\}/);
});

test("auditoria: búsqueda consulta el actor visible, IP y correlación anunciados", () => {
  const source = read("src/lib/audit-repository.ts");
  assert.match(source, /ilike\(auditLogs\.correlationId, pattern\)/);
  assert.match(source, /ilike\(auditLogs\.requestId, pattern\)/);
  assert.match(source, /->> 'ip' ilike \$\{pattern\}/);
  assert.match(source, /->> 'correlationId' ilike \$\{pattern\}/);
  assert.match(source, /exists \(select 1 from \$\{users\}/);
  assert.match(source, /\$\{users\.name\} ilike \$\{pattern\} or \$\{users\.email\} ilike \$\{pattern\}/);
});

test("auditoria: entidades de precios y promoción y fixture QA se presentan en español", () => {
  assert.equal(entityLabel("promotion_application"), "Aplicación de promoción");
  assert.equal(entityLabel("pricing_import"), "Importación de precios");
  assert.equal(actionLabel("qa.promotion_replay_fixture"), "Registró una prueba QA de reintento de promoción");
});

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
  assert.match(read("src/app/api/admin/auditoria/export/route.ts"), /auditExportSnapshot\(item.before, canViewSensitive\)/);
  assert.match(read("src/app/api/admin/auditoria/export/route.ts"), /auditExportSnapshot\(item.after, canViewSensitive\)/);
  assert.match(read("src/app/api/admin/auditoria/export/route.ts"), /audit\.sensitive\.view/);
  assert.equal(auditExportSnapshot({ sensitive: "private" }, false), "[REDACTED]");
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
