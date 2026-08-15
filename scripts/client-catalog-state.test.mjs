import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("client catalog resolvers do not synchronously reset state inside effects", async () => {
  const files = [
    "src/components/cart/CartQuotePanel.tsx",
    "src/components/catalog/CompareBar.tsx",
    "src/app/cuenta/carrito/page.tsx",
  ];
  for (const file of files) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /if \([^)]*length === 0\)\s*\{\s*set[A-Za-z]+\(/);
  }
});
