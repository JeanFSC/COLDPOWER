import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const nextConfig = readFileSync("next.config.ts", "utf8");

assert.match(
  nextConfig,
  /COLDPOWER_ALLOW_IFRAME_PREVIEW/,
  "preview embed must be controlled by an explicit environment flag",
);
assert.match(
  nextConfig,
  /X-Frame-Options/,
  "production security headers must keep X-Frame-Options available",
);
assert.match(
  nextConfig,
  /allowIframePreview/,
  "the preview flag must be used when composing security headers",
);

console.log("phase23 preview iframe guard: OK");
