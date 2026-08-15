import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("media admin exige permisos y usa validación de carga", () => {
  const route = read("src/app/api/admin/media/route.ts");
  assert.match(route, /requireApiPermission\("catalog\.media\.upload"\)/);
  assert.match(route, /validateMediaUpload/);
  assert.match(route, /mediaAssets/);
  assert.match(route, /writeAuditLog|auditLogs/);
  assert.match(route, /storageKey|storage-key|storage_key/);
});

test("media pública y eliminación lógica protegen assets", () => {
  const publicRoute = read("src/app/api/media/[id]/route.ts");
  const deleteRoute = read("src/app/api/admin/media/[id]/route.ts");
  assert.match(publicRoute, /status/);
  assert.match(publicRoute, /ACTIVE/);
  assert.match(deleteRoute, /requireApiPermission\("media\.view"\)/);
  assert.match(deleteRoute, /requireApiPermission\("media\.delete"\)/);
  assert.match(deleteRoute, /mediaAssetUsages/);
  assert.match(deleteRoute, /usos|usage|in use|en uso/i);
  assert.match(deleteRoute, /deletedAt|ARCHIVED/);
});

test("usos de media tienen ruta transaccional y auditoría", () => {
  const route = read("src/app/api/admin/media/[id]/usages/route.ts");
  assert.match(route, /requireApiPermission\("catalog\.media\.upload"\)/);
  assert.match(route, /mediaAssetUsages/);
  assert.match(route, /transaction|transactional|db\.insert/);
  assert.match(route, /audit|Audit/);
  assert.ok(existsSync(join(root, "src/lib/media-repository.ts")));
  assert.ok(existsSync(join(root, "src/lib/media-storage.ts")));
});
