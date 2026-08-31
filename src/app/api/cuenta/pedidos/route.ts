import { NextResponse } from "next/server";
import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { customers } from "@/db/crm-schema";
import { orders } from "@/db/sales-schema";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { paginationMeta, parsePagination } from "@/lib/pagination";

export async function GET(request: Request) {
  let userId: string;
  try { ({ userId } = await requireApiUser()); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("AUTH_REQUIRED", "Debes iniciar sesión para consultar tus pedidos.", 401); throw error; }
  const { requestedPage, pageSize } = parsePagination(request, 50);
  const where = eq(customers.userId, userId);
  const [items, [{ total }]] = await Promise.all([
    getDb().select({ order: orders }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(desc(orders.createdAt)).limit(pageSize).offset((requestedPage - 1) * pageSize),
    getDb().select({ total: count() }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where),
  ]);
  return NextResponse.json({ items, ...paginationMeta(requestedPage, pageSize, Number(total ?? 0)) });
}
