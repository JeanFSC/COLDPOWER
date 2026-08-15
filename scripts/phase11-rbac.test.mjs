import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = process.cwd();
const require = createRequire(import.meta.url);
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");
const exists = (relativePath) => existsSync(join(root, relativePath));
const rolesLibPath = "src/lib/roles.ts";
assert.equal(exists(rolesLibPath), true);
const source = read(rolesLibPath);
const transpiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const testModule = { exports: {} };
vm.runInNewContext(transpiled, { exports: testModule.exports, module: testModule, require }, { filename: rolesLibPath });
const { isAppRole } = testModule.exports;
assert.equal(isAppRole("admin"), true);
assert.equal(isAppRole("customer"), true);
assert.equal(isAppRole("root"), false);
assert.equal(isAppRole(undefined), false);
assert.equal(isAppRole(null), false);
assert.equal(isAppRole(""), false);

for (const file of ["src/db/schema.ts", "src/db/index.ts", "src/lib/auth.ts", "src/proxy.ts", "src/app/api/webhooks/clerk/route.ts", "src/app/sign-in/[[...sign-in]]/page.tsx", "src/app/sign-up/[[...sign-up]]/page.tsx", "src/app/cuenta/page.tsx", "src/app/cuenta/cotizaciones/page.tsx", "src/app/admin/layout.tsx", "src/app/admin/page.tsx", "src/app/admin/cotizaciones/page.tsx", "src/app/admin/usuarios/page.tsx"]) {
  assert.equal(exists(file), true, `${file} should exist`);
}
const cotizacionRoute = read("src/app/api/cotizacion/route.ts");
assert.match(cotizacionRoute, /(?:db\.transaction|tx\.insert\(quotes\))/ , "cotizacion route should persist quotes transactionally");
assert.match(cotizacionRoute, /catch \(persistError\)/);
const envSource = read("src/lib/env.ts");
assert.match(envSource, /isAuthConfigured/);
assert.match(envSource, /databaseConfig/);
