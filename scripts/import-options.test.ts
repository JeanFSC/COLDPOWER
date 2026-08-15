import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { parseImportOptions, resolveInventoryWorkbookPath } from "./import-inventory";

test("importer defaults to dry-run and only allows database writes with --apply", () => {
  assert.deepEqual(parseImportOptions([]), { apply: false, workbookPath: null });
  assert.deepEqual(parseImportOptions(["--apply", "inventory.xlsx"]), { apply: true, workbookPath: "inventory.xlsx" });
});

test("importer ignores pnpm's argument separator", () => {
  assert.deepEqual(parseImportOptions(["--", "inventory.xlsx"]), { apply: false, workbookPath: "inventory.xlsx" });
  assert.deepEqual(parseImportOptions(["--", "--apply", "inventory.xlsx"]), { apply: true, workbookPath: "inventory.xlsx" });
});

test("resolves the authoritative workbook from the parent directory of the application", () => {
  const projectDirectory = path.resolve("C:\\workspace\\ColdPower\\COLDPOWER");
  const expectedWorkbook = path.resolve(
    projectDirectory,
    "..",
    "INVENTARIO CATALOGO",
    "ColdPower_Inventario_Final_Validado.xlsx",
  );

  assert.equal(resolveInventoryWorkbookPath(null, projectDirectory), expectedWorkbook);
  assert.equal(resolveInventoryWorkbookPath("custom.xlsx", projectDirectory), path.resolve(projectDirectory, "custom.xlsx"));
});
