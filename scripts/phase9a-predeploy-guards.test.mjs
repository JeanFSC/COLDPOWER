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

// 1) .env.example contiene las variables nuevas y aviso de placeholder.
const envExample = read(".env.example");
for (const variable of [
  "NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA",
  "NEXT_PUBLIC_IS_PREVIEW",
  "NEXT_PUBLIC_SOCIAL_FACEBOOK",
  "NEXT_PUBLIC_SOCIAL_INSTAGRAM",
  "NEXT_PUBLIC_SOCIAL_TIKTOK",
]) {
  assert.match(envExample, new RegExp(variable), `.env.example should declare ${variable}`);
}
assert.match(
  envExample,
  /PLACEHOLDER/i,
  ".env.example should warn that values are placeholder / not for production",
);
assert.match(
  envExample,
  /NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false/,
  ".env.example should document the production-safe default (false)",
);

// 2) La configuración reconoce placeholders y bloquea en producción.
const env = read("src/lib/env.ts");
for (const symbol of [
  "isPlaceholderCompanyData",
  "getPlaceholderCompanyFields",
  "assertCompanyDataReady",
  "allowPlaceholderCompanyData",
  "NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA",
]) {
  assert.match(env, new RegExp(symbol), `env.ts should expose ${symbol}`);
}
// Default seguro: permite placeholders por defecto para no romper dev/preview/build actual.
assert.match(
  env,
  /allowPlaceholderCompanyData[\s\S]*?parseBoolean\([\s\S]*?true,/,
  "env.ts should default allowPlaceholderCompanyData to true (dev/preview safe)",
);
// El bloqueo duro solo aplica en producción cuando NO se permiten placeholders.
assert.match(
  env,
  /isProduction\s*&&\s*!allowPlaceholderCompanyData/,
  "env.ts should only hard-fail in production when placeholders are not allowed",
);
assert.match(env, /assertCompanyDataReady\(\);/, "env.ts should run the guard on load");

// 3) No se renderizan redes mock: company.ts es env-driven y sin URLs mock.
const company = read("src/data/company.ts");
for (const mock of [
  /facebook\.com\/coldpower/i,
  /instagram\.com\/coldpower/i,
  /tiktok\.com\/@?coldpower/i,
]) {
  assert.doesNotMatch(company, mock, "company.ts must not hardcode mock social links");
}
assert.match(company, /socialConfig/, "company.ts should derive social links from env (socialConfig)");
assert.match(company, /socialLinks/, "company.ts should still expose socialLinks key");
assert.match(
  company,
  /activeSocialLinks/,
  "company.ts should expose activeSocialLinks (only real links)",
);

// Ningún componente debe enlazar a redes mock ColdPower.
const srcFiles = readdirSync(join(root, "src"), { recursive: true })
  .map((file) => String(file))
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .map((file) => join("src", file));
for (const file of srcFiles) {
  assert.doesNotMatch(
    read(file),
    /(facebook|instagram|tiktok)\.com\/@?coldpower/i,
    `${file} must not link to mock social profiles`,
  );
}

// 4) Documentación de datos reales obligatorios.
for (const doc of [
  "docs/deployment.md",
  "docs/deploy-preview-checklist.md",
  "docs/production-checklist.md",
]) {
  assert.equal(exists(doc), true, `${doc} should exist`);
  assert.match(
    read(doc),
    /Datos reales obligatorios antes de producción/i,
    `${doc} should document the mandatory real-data block`,
  );
}

// 5) Sin referencias a Zerox en código fuente y assets (los scripts de test
//    contienen estos literales a propósito como patrón de guard, por eso se excluyen).
const zeroxScanFiles = [
  ...srcFiles,
  ...readdirSync(join(root, "public"), { recursive: true })
    .map((file) => String(file))
    .filter((file) => /\.(svg|webp|png|jpg|jpeg)$/.test(file))
    .map((file) => join("public", file)),
];
for (const file of zeroxScanFiles) {
  const source = read(file);
  assert.doesNotMatch(source, /zeroxmotors\.pe/i, `${file} should not reference zeroxmotors.pe`);
  assert.doesNotMatch(source, /Zerox/i, `${file} should not reference Zerox`);
}

console.log("phase9a predeploy guards: OK");
