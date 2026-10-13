import assert from "node:assert/strict";
import test from "node:test";
import { stockImportErrorMessage } from "../src/lib/stock-import-error";

test("stock import exposes only recognized validation messages", () => {
  const validation = "Ya existe un saldo inicial para este producto y local.";
  assert.equal(stockImportErrorMessage(new Error(validation)), validation);
  assert.equal(stockImportErrorMessage(new Error("Debe existir una sola columna sku.")), "Debe existir una sola columna sku.");
  for (const error of [new Error("Failed query: insert into inventory_balances secret"), new Error("corrupt ZIP internal path"), null]) {
    assert.equal(stockImportErrorMessage(error), "No se pudo procesar el archivo. Revisa su formato o vuelve a intentarlo.");
  }
});
