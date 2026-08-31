import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");
const exists = (relativePath) => existsSync(join(root, relativePath));

const envExample = read(".env.example");
for (const variable of ["NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA", "NEXT_PUBLIC_IS_PREVIEW", "NEXT_PUBLIC_SOCIAL_FACEBOOK", "NEXT_PUBLIC_SOCIAL_INSTAGRAM", "NEXT_PUBLIC_SOCIAL_TIKTOK"]) assert.match(envExample, new RegExp(variable));
assert.match(envExample, /PLACEHOLDER/i);
assert.match(envExample, /NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false/);

const env = read("src/lib/env.ts");
for (const symbol of ["isPlaceholderCompanyData", "getPlaceholderCompanyFields", "assertCompanyDataReady", "allowPlaceholderCompanyData", "NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA"]) assert.match(env, new RegExp(symbol));
assert.match(env, /allowPlaceholderCompanyData[\s\S]*?parseBoolean\([\s\S]*?false[),]/);
assert.match(env, /isProduction\s*&&\s*!allowPlaceholderCompanyData/);
assert.match(env, /assertCompanyDataReady\(\);/);

const company = read("src/data/company.ts");
for (const mock of [/facebook\.com\/coldpower/i, /instagram\.com\/coldpower/i, /tiktok\.com\/@?coldpower/i]) assert.doesNotMatch(company, mock);
assert.match(company, /socialConfig/);
assert.match(company, /socialLinks/);
assert.match(company, /activeSocialLinks/);

const srcFiles = readdirSync(join(root, "src"), { recursive: true }).map((file) => String(file)).filter((file) => /\.(ts|tsx)$/.test(file)).map((file) => join("src", file));
for (const file of srcFiles) assert.doesNotMatch(read(file), /(facebook|instagram|tiktok)\.com\/@?coldpower/i, `${file} must not link to mock social profiles`);
for (const doc of ["docs/deployment.md", "docs/deploy-preview-checklist.md", "docs/production-checklist.md"]) {
  assert.equal(exists(doc), true, `${doc} should exist`);
  assert.match(read(doc), /Datos reales obligatorios antes de producci/i);
}

const zeroxScanFiles = [...srcFiles, ...readdirSync(join(root, "public"), { recursive: true }).map((file) => String(file)).filter((file) => /\.(svg|webp|png|jpg|jpeg)$/.test(file)).map((file) => join("public", file))];
for (const file of zeroxScanFiles) {
  assert.doesNotMatch(read(file), /zeroxmotors\.pe/i, `${file} should not reference zeroxmotors.pe`);
  assert.doesNotMatch(read(file), /Zerox/i, `${file} should not reference Zerox`);
}
console.log("phase9a predeploy guards: OK");
