import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("Inicio y Cotizaciones apuntan al conteo canónico de cotizaciones abiertas", async () => {
  const repository = await read("src/lib/quote-repository.ts");
  const dashboard = await read("src/lib/operations-dashboard.ts");
  const home = await read("src/components/admin/AdminTanda2Workspaces.tsx");

  assert.match(repository, /export async function getOpenQuoteCount/);
  assert.match(repository, /getOpenQuoteCount\(filters\)/);
  assert.match(dashboard, /getOpenQuoteCount\(\)/);
  assert.match(home, /number\(data\?\.openQuotes\).*cotizaciones abiertas/);
  assert.doesNotMatch(home, /number\(snapshot\?\.queueTotals\.quotes\).*cotizaciones abiertas/);
});
