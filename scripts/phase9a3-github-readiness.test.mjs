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

// 1) .gitignore contiene patrones críticos y NO ignora los ejemplos.
assert.equal(exists(".gitignore"), true, ".gitignore should exist");
const gitignore = read(".gitignore");
for (const pattern of [
  "node_modules",
  ".next",
  "/out",
  "/dist",
  "/build",
  ".env",
  ".env.local",
  ".env.preview",
  ".vercel",
  "test-results",
  "playwright-report",
  ".playwright-cli",
  "coverage",
  "*.log",
  ".DS_Store",
  "Thumbs.db",
]) {
  assert.ok(
    gitignore.includes(pattern),
    `.gitignore should ignore ${pattern}`,
  );
}
// Los ejemplos deben quedar versionados (negaciones presentes).
assert.match(gitignore, /^!\.env\.example$/m, ".gitignore must not ignore .env.example");
assert.match(
  gitignore,
  /^!\.env\.preview\.example$/m,
  ".gitignore must not ignore .env.preview.example",
);

// 2) Ejemplos de entorno presentes.
assert.equal(exists(".env.example"), true, ".env.example should exist");
assert.equal(exists(".env.preview.example"), true, ".env.preview.example should exist");

// 3) .env.local no existe o está ignorado por .gitignore.
assert.ok(
  !exists(".env.local") || /(^|\n)\.env\.local(\s|$)/.test(gitignore) || gitignore.includes(".env*"),
  ".env.local must not be committed (absent or ignored)",
);

// 4) README menciona preview y producción.
assert.equal(exists("README.md"), true, "README.md should exist");
const readme = read("README.md");
assert.match(readme, /ColdPower/, "README should describe ColdPower");
assert.match(readme, /preview/i, "README should mention preview");
assert.match(readme, /producci[oó]n/i, "README should mention production");
assert.match(readme, /pnpm install/, "README should document install");
assert.match(readme, /pnpm dev/, "README should document dev");

// 5) Documentación de GitHub.
assert.equal(exists("docs/github-ready.md"), true, "docs/github-ready.md should exist");
const ghReady = read("docs/github-ready.md");
assert.match(ghReady, /git commit/, "github-ready should include suggested commit command");
assert.match(ghReady, /NUNCA deben subirse|nunca deben subirse/i, "github-ready should list forbidden files");

// 6) test:all existe en package.json.
const pkg = JSON.parse(read("package.json"));
assert.ok(pkg.scripts && pkg.scripts["test:all"], "package.json should define test:all");

// 7) Sin referencias a Zerox ni redes mock en src.
const srcFiles = readdirSync(join(root, "src"), { recursive: true })
  .map((file) => String(file))
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .map((file) => join("src", file));
for (const file of srcFiles) {
  const source = read(file);
  assert.doesNotMatch(source, /zeroxmotors\.pe/i, `${file} should not reference zeroxmotors.pe`);
  assert.doesNotMatch(source, /Zerox/i, `${file} should not reference Zerox`);
}

// 8) company.ts sin redes mock hardcodeadas.
const company = read("src/data/company.ts");
for (const mock of [
  /facebook\.com\/coldpower/i,
  /instagram\.com\/coldpower/i,
  /tiktok\.com\/@?coldpower/i,
]) {
  assert.doesNotMatch(company, mock, "company.ts must not hardcode mock social links");
}

console.log("phase9a3 github readiness: OK");
