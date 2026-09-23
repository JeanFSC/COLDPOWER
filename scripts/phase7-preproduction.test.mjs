import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
for (const file of [".env.example", "src/lib/env.ts", "src/app/robots.ts", "src/app/sitemap.ts", "next.config.ts"]) assert.equal(existsSync(join(root, file)), true, file);
assert.match(read("src/app/robots.ts"), /sitemap/);
assert.match(read("src/app/sitemap.ts"), /products|categories/);
assert.match(read("next.config.ts"), /X-Content-Type-Options/);
assert.match(read("src/app/api/cotizacion/route.ts"), /checkQuoteRateLimit|429/);
assert.match(read("src/app/api/libro-de-reclamaciones/route.ts"), /POST|rate/i);
console.log("Phase 7 public preproduction contract: PASS");

