import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

assert.equal(existsSync(join(root, "src/app/api/cuenta/perfil/route.ts")), true);
assert.equal(existsSync(join(root, "src/components/account/ProfileForm.tsx")), true);
const route = read("src/app/api/cuenta/perfil/route.ts");
const form = read("src/components/account/ProfileForm.tsx");
const account = read("src/app/cuenta/page.tsx");

assert.match(route, /requireApiUser/);
assert.match(route, /ApiAuthorizationError/);
assert.match(route, /PATCH/);
assert.match(route, /users/);
assert.match(form, /fetch\("\/api\/cuenta\/perfil"/);
assert.match(form, /name|phone/);
assert.match(account, /ProfileForm/);
assert.match(account, /key=\{section\.href \+ section\.title\}/);

console.log("Phase 30 profile editing contract: PASS");
