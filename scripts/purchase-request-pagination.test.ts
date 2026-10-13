import assert from "node:assert/strict";
import test from "node:test";
import { purchaseRequestPageHref } from "../src/lib/purchases-navigation";

test("Solicitudes: paginar todos los estados no introduce un filtro", () => {
  const query = new URL(purchaseRequestPageHref("", 2), "http://localhost").searchParams;
  assert.equal(query.get("requestPage"), "2");
  assert.equal(query.has("requestStatus"), false);
});

test("Solicitudes: paginar conserva estado y filtros existentes", () => {
  const query = new URL(purchaseRequestPageHref("requestStatus=REJECTED&requestPage=1&supplierId=qa&status=PENDING", 3), "http://localhost").searchParams;
  assert.equal(query.get("requestPage"), "3");
  assert.equal(query.get("requestStatus"), "REJECTED");
  assert.equal(query.get("supplierId"), "qa");
  assert.equal(query.get("status"), "PENDING");
});
