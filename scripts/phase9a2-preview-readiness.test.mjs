import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return existsSync(join(root, relativePath));
}

// 1) .env.preview.example existe con las flags de preview correctas.
assert.equal(exists(".env.preview.example"), true, ".env.preview.example should exist");
const envPreview = read(".env.preview.example");
assert.match(
  envPreview,
  /NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=true/,
  ".env.preview.example should allow placeholders (true)",
);
assert.match(
  envPreview,
  /NEXT_PUBLIC_IS_PREVIEW=true/,
  ".env.preview.example should mark preview mode (true)",
);
assert.match(
  envPreview,
  /SOLO un ejemplo|solo ejemplo|NO usar para producción/i,
  ".env.preview.example should state it is only an example / not for production",
);

// 2) PreviewBanner existe, depende de isPreview y se integra en layout.
assert.equal(
  exists("src/components/shared/PreviewBanner.tsx"),
  true,
  "PreviewBanner component should exist",
);
const banner = read("src/components/shared/PreviewBanner.tsx");
assert.match(banner, /isPreview/, "PreviewBanner should gate rendering on isPreview");
assert.match(banner, /return null/, "PreviewBanner should render nothing when not in preview");
assert.match(
  banner,
  /Vista previa privada/,
  "PreviewBanner should display the private preview notice",
);

const layout = read("src/app/layout.tsx");
assert.match(layout, /PreviewBanner/, "layout.tsx should integrate PreviewBanner");

// 3) env.ts expone isPreview leído de forma segura.
const env = read("src/lib/env.ts");
assert.match(env, /export const isPreview/, "env.ts should export isPreview");
assert.match(
  env,
  /NEXT_PUBLIC_IS_PREVIEW/,
  "env.ts should read NEXT_PUBLIC_IS_PREVIEW",
);

// 4) Documentación de deploy preview con pasos de Vercel.
const previewDocs = read("docs/deploy-preview-checklist.md");
assert.match(previewDocs, /Vercel/i, "deploy preview checklist should mention Vercel");
assert.match(previewDocs, /pnpm install/, "deploy preview checklist should document install command");
assert.match(previewDocs, /pnpm build/, "deploy preview checklist should document build command");
assert.match(
  previewDocs,
  /aviso de preview|Vista previa privada/i,
  "deploy preview checklist should ask to verify the preview banner",
);

// Contraste preview vs producción documentado.
const deployment = read("docs/deployment.md");
assert.match(
  deployment,
  /Preview privado vs Producción/i,
  "deployment.md should contrast preview vs production",
);

// 5) Sin redes mock hardcodeadas y sin referencias a Zerox en src.
const srcFiles = readdirSync(join(root, "src"), { recursive: true })
  .map((file) => String(file))
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .map((file) => join("src", file));
for (const file of srcFiles) {
  const source = read(file);
  assert.doesNotMatch(
    source,
    /(facebook|instagram|tiktok)\.com\/@?coldpower/i,
    `${file} must not hardcode mock social profiles`,
  );
  assert.doesNotMatch(source, /zeroxmotors\.pe/i, `${file} should not reference zeroxmotors.pe`);
  assert.doesNotMatch(source, /Zerox/i, `${file} should not reference Zerox`);
}

console.log("phase9a2 preview readiness: OK");
