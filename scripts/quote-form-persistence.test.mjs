import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("quote form communicates persistent registration instead of a temporary API", async () => {
  const form = await readFile(path.join(root, "src/components/quote/QuoteForm.tsx"), "utf8");

  assert.doesNotMatch(form, /API temporal/i);
  assert.doesNotMatch(form, /registro temporal/i);
  assert.match(form, /solicitud.*registrad/i);
});
