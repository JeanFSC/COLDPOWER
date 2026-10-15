import assert from "node:assert/strict";
import test from "node:test";
import { groupSaleOrderPayments } from "../src/lib/sale-order-payments";

test("sale detail groups repeated orders and retains every payment and refund", () => {
  const order = { id: "order-qa", code: "QA" };
  const result = groupSaleOrderPayments([
    { order, payment: { id: "cancelled", amount: "11.00" }, refundedAmount: "0" },
    { order, payment: { id: "confirmed", amount: "11.00" }, refundedAmount: "2.00" },
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].payments.map((payment) => payment.id), ["cancelled", "confirmed"]);
  assert.equal(result[0].payments[1].refundedAmount, "2.00");
});

test("sale detail keeps distinct unpaid orders and input order", () => {
  const result = groupSaleOrderPayments<{ id: string }, { id: string }>([
    { order: { id: "newest" }, payment: null, refundedAmount: "0" },
    { order: { id: "older" }, payment: null, refundedAmount: "0" },
  ]);
  assert.deepEqual(result.map((entry) => entry.order.id), ["newest", "older"]);
  assert.deepEqual(result.map((entry) => entry.payments), [[], []]);
  assert.deepEqual(groupSaleOrderPayments([]), []);
});
