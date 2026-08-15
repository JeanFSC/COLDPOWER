import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("Bloque D declara tablas y migración CRM", () => {
  const schema = read("src/db/crm-schema.ts");
  for (const table of ["customers", "opportunities", "opportunityItems", "opportunityStageHistory", "crmActivities", "crmTasks"]) assert.match(schema, new RegExp(`export const ${table}`));
  const migrationFile = readdirSync(join(root, "drizzle")).find((file) => /^0010_.*\.sql$/.test(file));
  assert.ok(migrationFile, "falta la migración 0010 del Bloque D");
  const migration = read(join("drizzle", migrationFile));
  for (const table of ["customers", "opportunities", "opportunity_items", "opportunity_stage_history", "crm_activities", "crm_tasks"]) assert.match(migration, new RegExp(table));
});

test("rutas CRM usan permisos y delegan mutaciones auditadas al servicio", () => {
  const files = ["src/app/api/admin/clientes/route.ts", "src/app/api/admin/oportunidades/route.ts", "src/app/api/admin/oportunidades/[id]/route.ts", "src/app/api/admin/actividades/route.ts", "src/app/api/admin/tareas/route.ts"];
  for (const file of files) {
    const source = read(file);
    assert.match(source, /requireApiPermission/);
    assert.match(source, /crm-service/);
  }
  const service = read("src/lib/crm-service.ts");
  assert.match(service, /transaction/);
  assert.match(service, /auditLogs/);
  assert.match(read("src/components/admin/CrmPipeline.tsx"), /draggable|onDrag|drop/i);
});
