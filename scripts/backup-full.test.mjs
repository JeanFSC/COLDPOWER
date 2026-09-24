import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("el respaldo completo usa pg_dump custom, retención y los binarios pg17", () => {
  const source = read("scripts/backup-full.ps1");
  assert.match(source, /pg_dump\.exe/);
  assert.match(source, /format=custom/);
  assert.match(source, /ColdPowerBackups/);
  assert.match(source, /RetentionDays/);
  assert.match(source, /coldpower-\$Environment-\$timestamp\.dump/);
  assert.match(source, /tables, sequences and enum types/i);
});

test("la restauración completa solo permite localhost y compara tablas", () => {
  const source = read("scripts/restore-full.ps1");
  assert.match(source, /localhost/);
  assert.match(source, /127\.0\.0\.1/);
  assert.match(source, /coldpower_restore_test/);
  assert.match(source, /pg_restore\.exe/);
  assert.match(source, /information_schema\.tables/);
  assert.match(source, /differences/);
  assert.match(source, /single-transaction/);
});

test("la guía documenta la copia manual a OneDrive y no registra tareas", () => {
  const guide = read("docs/dev/respaldos.md");
  const task = read("ops/register-backup-task.ps1");
  assert.match(guide, /OneDrive/i);
  assert.match(guide, /Programador de tareas/i);
  assert.match(guide, /no se registra/i);
  assert.match(task, /Register-ScheduledTask/);
  assert.match(task, /02:00|AddHours\(2\)/);
});
