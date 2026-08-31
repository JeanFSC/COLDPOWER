import { count, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { customers } from "@/db/crm-schema";
import { orders, payments } from "@/db/sales-schema";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { paginationMeta, parsePagination } from "@/lib/pagination";

export async function GET(request: Request) {
  let userId: string;
  try { ({ userId } = await requireApiUser()); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("AUTH_REQUIRED", "Debes iniciar sesión para consultar tus pagos.", 401); throw error; }
  const { requestedPage, pageSize } = parsePagination(request, 50);
  const where = eq(customers.userId, userId);
  const [rows, [{ total }]] = await Promise.all([
    getDb().select({ payment: payments, orderCode: orders.code }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(desc(payments.createdAt)).limit(pageSize).offset((requestedPage - 1) * pageSize),
    getDb().select({ total: count() }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(where),
  ]);
  const items = rows.map(({ payment, orderCode }) => ({ ...payment, orderCode }));
  return NextResponse.json({ items, ...paginationMeta(requestedPage, pageSize, Number(total ?? 0)) });
}
