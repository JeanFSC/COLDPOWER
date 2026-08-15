import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(path.join(process.cwd(), "src/proxy.ts"), "utf8");
const nextConfig = fs.readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");

test("Clerk auth redirects preserve the browser host behind the local wildcard bind", () => {
  assert.match(source, /x-forwarded-host/);
  assert.match(source, /headers\.get\("host"\)/);
  assert.match(source, /returnBackUrl: getReturnBackUrl\(req\)/);
  assert.doesNotMatch(source, /returnBackUrl: req\.url/);
  assert.match(source, /url\.port\s*=\s*""/);
});

test("Next dev permite el hostname público sin alterar localhost", () => {
  assert.match(nextConfig, /allowedDevOrigins/);
  assert.match(nextConfig, /dev\.coldpower\.pe/);
});
