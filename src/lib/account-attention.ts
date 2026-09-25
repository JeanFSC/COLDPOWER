import { and, gte, inArray, isNull, not, or } from "drizzle-orm";
import { quotes } from "@/db/schema";
import {
  customerDecisionQuoteLegacyStatuses,
  customerDecisionQuoteWorkflowStatuses,
  isQuoteAwaitingCustomerDecision,
  startOfLimaDay,
  quoteWorkflowStatuses,
} from "@/lib/quote-workflow";

export const accountActiveOrderStatuses = [
  "NEW",
  "RECEIVED",
  "PAYMENT_PENDING",
  "PAID",
  "PREPARING",
  "READY",
  "READY_FOR_PICKUP",
  "IN_TRANSIT",
  "SHIPPED",
] as const;

export const accountNonPaymentOrderStatuses = [
  "NEW",
  "RECEIVED",
  "PAID",
  "PREPARING",
  "READY",
  "READY_FOR_PICKUP",
  "IN_TRANSIT",
  "SHIPPED",
] as const;

export const accountDeliveryAttentionStatuses = ["IN_TRANSIT", "SHIPPED"] as const;
export const accountPendingPaymentStatuses = ["PENDING", "UNDER_REVIEW"] as const;

export function isAccountOrderInProgress(status: string, paymentDueAt: Date | null | undefined, now = new Date()) {
  if (!(accountActiveOrderStatuses as readonly string[]).includes(status)) return false;
  return status !== "PAYMENT_PENDING" || !paymentDueAt || paymentDueAt.getTime() >= now.getTime();
}

export function isAccountPaymentPending(
  paymentStatus: string,
  orderStatus: string,
  paymentDueAt: Date | null | undefined,
  now = new Date(),
) {
  return (accountPendingPaymentStatuses as readonly string[]).includes(paymentStatus) && isAccountOrderInProgress(orderStatus, paymentDueAt, now);
}

export function accountQuoteAttentionCondition(now = new Date()) {
  return and(
    or(
      inArray(quotes.workflowStatus, customerDecisionQuoteWorkflowStatuses),
      and(
        or(isNull(quotes.workflowStatus), not(inArray(quotes.workflowStatus, quoteWorkflowStatuses))),
        inArray(quotes.status, customerDecisionQuoteLegacyStatuses),
      ),
    ),
    or(isNull(quotes.validUntil), gte(quotes.validUntil, startOfLimaDay(now))),
  )!;
}

export { isQuoteAwaitingCustomerDecision };
