import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authSource = readFileSync("src/lib/auth.ts", "utf8");
assert.match(authSource, /if\s*\(!isAuthConfigured\)\s*(?:\{[\s\S]*?\}\s*)?redirect\("\/"\)/, "protected routes must fail closed with a controlled redirect when Clerk is not configured");
console.log("phase14 auth configuration guard: OK");
