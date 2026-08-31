import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const proxySource = readFileSync("src/proxy.ts", "utf8");
assert.match(
  proxySource,
  /isAuthConfigured\s*\?\s*clerkMiddleware[\s\S]*:\s*\(\)\s*=>\s*NextResponse\.next\(\)/,
  "proxy must not invoke Clerk middleware when auth is not configured",
);

console.log("phase13 health runtime guard: OK");
