import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("database schema is applied through the reproducible Drizzle migration runner", async () => {
  const runnerPath = path.join(root, "scripts/migrate-database.ts");
  assert.equal(existsSync(runnerPath), true);

  const [runner, packageJson] = await Promise.all([
    readFile(runnerPath, "utf8"),
    readFile(path.join(root, "package.json"), "utf8"),
  ]);

  assert.match(runner, /drizzle-orm\/neon-serverless\/migrator/);
  assert.match(runner, /drizzle-orm\/node-postgres\/migrator/);
  assert.match(runner, /migrationsFolder/);
  assert.match(runner, /client\.close\(\)/);
  assert.match(runner, /getDatabaseDriver/);
  assert.match(packageJson, /"db:migrate"/);
  assert.match(packageJson, /"db:local:migrate"/);
});
