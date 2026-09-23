import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync("src/lib/auth.ts", "utf8");
const route = readFileSync("src/app/api/admin/usuarios/[id]/route.ts", "utf8");
const page = readFileSync("src/app/admin/usuarios/page.tsx", "utf8");
const roleSource = readFileSync("src/lib/roles.ts", "utf8");
const migration = readFileSync("drizzle/0007_material_miracleman.sql", "utf8");

assert.match(auth, /roleFromClaims/);
assert.match(auth, /isStaffRole/);
assert.match(route, /roles\.manage/);
assert.match(route, /SUPERADMIN/);
assert.match(page, /users\.view/);
for (const role of ["ADMIN", "VENTAS", "ALMACEN", "COMPRAS", "REPORTES", "JEFATURA", "SUPERADMIN"]) assert.match(roleSource, new RegExp(role));
assert.match(migration, /ALTER TYPE .*app_role.*ADD VALUE .*ADMIN/);
console.log("CP-027 RBAC admin route contract: PASS");
