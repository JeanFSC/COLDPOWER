import assert from "node:assert/strict";
import test from "node:test";
import { supplierReceiptPresentation } from "../src/lib/supplier-receipt-presentation";

test("recepciones registradas y canceladas tienen texto y color distintos", () => {
  const posted = supplierReceiptPresentation("POSTED");
  const cancelled = supplierReceiptPresentation("CANCELLED");
  assert.equal(posted.label, "registrada");
  assert.equal(cancelled.label, "cancelada");
  assert.notEqual(posted.dotClass, cancelled.dotClass);
  assert.equal(supplierReceiptPresentation("UNKNOWN").label, "estado no reconocido");
});
