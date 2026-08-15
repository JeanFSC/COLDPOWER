import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "src/app/api/health/route.ts",
  "ecosystem.config.cjs",
  "ops/Caddyfile",
  "ops/deploy-production.sh",
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `missing production file: ${file}`);
}

const healthRoute = readFileSync("src/app/api/health/route.ts", "utf8");
assert.match(healthRoute, /export\s+(?:async\s+)?function\s+GET/);
assert.match(healthRoute, /ok:\s*true/);

const pm2Config = readFileSync("ecosystem.config.cjs", "utf8");
assert.match(pm2Config, /name:\s*["']coldpower["']/);
assert.match(pm2Config, /NODE_ENV:\s*["']production["']/);
assert.match(pm2Config, /PORT:\s*["']3000["']/);

const caddyfile = readFileSync("ops/Caddyfile", "utf8");
assert.match(caddyfile, /coldpower\.pe/);
assert.match(caddyfile, /reverse_proxy\s+127\.0\.0\.1:3000/);

const deployScript = readFileSync("ops/deploy-production.sh", "utf8");
assert.match(deployScript, /set -Eeuo pipefail/);
assert.match(deployScript, /--frozen-lockfile/);
assert.match(deployScript, /drizzle-kit migrate/);

console.log("phase12 production readiness: OK");
