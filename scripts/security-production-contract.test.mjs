import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const env = read("src/lib/env.ts");
const schema = read("src/db/schema.ts");
const roleSource = read("src/lib/roles.ts");
const settingsRoute = read("src/app/api/admin/configuracion/route.ts");
const whatsappRoute = read("src/app/api/whatsapp/lead/route.ts");
const nextConfig = read("next.config.ts");

assert.match(env, /NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA, false/);
assert.match(env, /WHATSAPP_RATE_LIMIT_MAX/);
assert.match(schema, /paymentMethods/);
assert.match(schema, /guaranteeTerms/);
assert.match(schema, /coverage/);
assert.match(schema, /legalLinks/);
assert.match(roleSource, /settings\.business\.edit/);
assert.match(settingsRoute, /requireApiPermission\("settings\.business\.edit"\)/);
assert.match(settingsRoute, /companySettings/);
assert.match(whatsappRoute, /checkPublicRateLimit/);
assert.match(whatsappRoute, /status: 429/);
assert.match(nextConfig, /X-Content-Type-Options/);
assert.match(nextConfig, /X-Frame-Options/);

console.log("security-production-contract: ok");
