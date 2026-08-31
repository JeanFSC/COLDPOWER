import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.match(packageJson.scripts.dev, /--hostname\s+0\.0\.0\.0/, "dev server should bind to all local interfaces for embedded previews");
assert.match(packageJson.scripts.start, /--hostname\s+0\.0\.0\.0/, "production server should bind to all local interfaces for embedded previews");

console.log("Phase 31 embedded preview host contract: PASS");
