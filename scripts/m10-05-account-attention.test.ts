import assert from "node:assert/strict";
import test from "node:test";
import {
  accountActiveOrderStatuses,
  accountPendingPaymentStatuses,
  isAccountOrderInProgress,
  isAccountPaymentPending,
  isQuoteAwaitingCustomerDecision,
} from "../src/lib/account-attention";
import { quoteWorkflowStatuses } from "../src/lib/quote-workflow";

const now = new Date("2026-09-25T17:00:00.000Z");
const validToday = new Date("2026-09-25T05:00:00.000Z");
const beforeTodayInLima = new Date("2026-09-25T04:59:59.000Z");
const validTomorrow = new Date("2026-09-26T05:00:00.000Z");

test("M10-05 solo muestra cotizaciones que esperan decisión y siguen vigentes", () => {
  for (const workflowStatus of quoteWorkflowStatuses) {
    const expected = workflowStatus === "SENT" || workflowStatus === "FOLLOW_UP";
    assert.equal(
      isQuoteAwaitingCustomerDecision("enviada", workflowStatus, validToday, now),
      expected,
      "workflow status " + workflowStatus,
    );
  }

  assert.equal(isQuoteAwaitingCustomerDecision("cotizada", "DRAFT", validToday, now), false);
  assert.equal(isQuoteAwaitingCustomerDecision("cotizada", null, validToday, now), true);
  assert.equal(isQuoteAwaitingCustomerDecision("aprobada", "DRAFT", validToday, now), false);
  assert.equal(isQuoteAwaitingCustomerDecision("convertida", "DRAFT", validToday, now), false);
  assert.equal(isQuoteAwaitingCustomerDecision("enviada", "SENT", beforeTodayInLima, now), false);
  assert.equal(isQuoteAwaitingCustomerDecision("enviada", "SENT", validToday, now), true);
  assert.equal(isQuoteAwaitingCustomerDecision("enviada", "SENT", validTomorrow, now), true);
  assert.equal(isQuoteAwaitingCustomerDecision("enviada", "SENT", null, now), true);
});

test("M10-05 excluye pagos vencidos y pedidos cancelados o entregados", () => {
  assert.deepEqual(accountPendingPaymentStatuses, ["PENDING", "UNDER_REVIEW"]);
  assert.ok(accountActiveOrderStatuses.includes("PAYMENT_PENDING"));
  assert.equal(isAccountPaymentPending("PENDING", "PAYMENT_PENDING", new Date("2026-09-25T18:00:00.000Z"), now), true);
  assert.equal(isAccountPaymentPending("UNDER_REVIEW", "PAYMENT_PENDING", new Date("2026-09-25T16:59:59.000Z"), now), false);
  assert.equal(isAccountPaymentPending("PENDING", "CANCELLED", null, now), false);
  assert.equal(isAccountPaymentPending("PENDING", "DELIVERED", null, now), false);
  assert.equal(isAccountOrderInProgress("PAYMENT_PENDING", new Date("2026-09-25T16:59:59.000Z"), now), false);
  assert.equal(isAccountOrderInProgress("DELIVERED", null, now), false);
  assert.equal(isAccountOrderInProgress("CANCELLED", null, now), false);
  assert.equal(isAccountOrderInProgress("IN_TRANSIT", null, now), true);
});
