import { and, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { paymentRefunds, payments, orders } from "@/db/sales-schema";
import type { OperationsFilters } from "@/lib/operations-contract";

type TimestampColumn = typeof orders.createdAt | typeof payments.createdAt;

function addDateConditions(conditions: SQL[], column: TimestampColumn, filters: OperationsFilters) {
  if (filters.fromAt) conditions.push(gte(column, filters.fromAt));
  if (filters.toAt) conditions.push(lte(column, new Date(filters.toAt.getTime() + 24 * 60 * 60 * 1000 - 1)));
}

/** Counts orders that need payment review, including ledger mismatches. */
export async function getOperationsPaymentReviewCount(filters: OperationsFilters) {
  const orderConditions: SQL[] = [sql`${orders.status} <> 'CANCELLED'`];
  addDateConditions(orderConditions, orders.createdAt, filters);
  if (filters.locationId) orderConditions.push(eq(orders.locationId, filters.locationId));
  if (filters.sellerId) orderConditions.push(eq(orders.sellerId, filters.sellerId));
  if (filters.status) orderConditions.push(sql`${orders.status}::text = ${filters.status}`);

  const paymentReviewCondition = or(
    inArray(payments.status, ["PENDING", "UNDER_REVIEW", "ERROR"]),
    sql`abs(
      (select coalesce(sum(p2.amount), 0)
       from payments p2
       where p2.order_id = ${payments.orderId}
         and p2.currency = ${payments.currency}
         and p2.status in ('CONFIRMED', 'APPROVED', 'REFUNDED'))
      - (select coalesce(sum(r.amount), 0)
         from ${paymentRefunds} r
         join payments p3 on p3.id = r.payment_id
         where p3.order_id = ${payments.orderId}
           and p3.currency = ${payments.currency}
           and r.currency = p3.currency
           and r.status = 'SUCCEEDED')
      - (select o.total
         from orders o
         where o.id = ${payments.orderId}
           and o.currency = ${payments.currency})
    ) > 0.005`,
  );
  const paymentConditions: SQL[] = [paymentReviewCondition ?? sql`false`];
  addDateConditions(paymentConditions, payments.createdAt, filters);

  const [row] = await getDb()
    .select({ count: sql<number>`count(distinct ${payments.orderId})` })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(and(...paymentConditions, ...orderConditions));
  return Number(row?.count ?? 0);
}
