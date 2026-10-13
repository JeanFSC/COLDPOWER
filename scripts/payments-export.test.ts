import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { paymentsWorkbook } from "../src/lib/payments-export";
import type { PaymentListItem } from "../src/lib/payments-contract";

test("Excel payments export preserves columns, numeric amounts, accents and UTC", () => {
  const item = {
    id: "qa-payment", orderCode: "PED-QA", saleCode: null,
    customerName: '=HYPERLINK("example.test")', amount: "11.00", currency: "PEN",
    method: "DEBIT_CARD", provider: "QA", providerReference: "000123",
    status: "PENDING", expectedAmount: "11.00", netReceivedAmount: "0.00",
    difference: "-11.00", reconciliation: "UNDERPAID", attempts: 0,
    createdAt: new Date("2026-10-07T05:00:00.000Z"),
  } as PaymentListItem;
  const book = XLSX.read(paymentsWorkbook([item]), { type: "array" });
  const sheet = book.Sheets.Pagos;
  assert.equal(sheet["!ref"], "A1:P2");
  assert.equal(sheet.D2.t, "s");
  assert.equal(sheet.D2.f, undefined);
  assert.equal(sheet.E2.v, 11);
  assert.equal(sheet.M2.v, -11);
  assert.equal(sheet.M2.t, "n");
  assert.equal(sheet.I2.v, "000123");
  assert.equal(sheet.G2.v, "Tarjeta de débito");
  assert.equal(sheet.J2.v, "Pendiente");
  assert.equal(sheet.P2.v, "2026-10-07T05:00:00.000Z");
  assert.equal(sheet["!autofilter"]?.ref, "A1:P2");
});

test("Empty export keeps all sixteen headers", () => {
  const book = XLSX.read(paymentsWorkbook([]), { type: "array" });
  assert.equal(book.Sheets.Pagos["!ref"], "A1:P1");
});
