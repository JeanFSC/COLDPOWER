import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { listPurchasedProductsForUser } from "@/lib/customer-history";
import { paginationMeta, parsePagination } from "@/lib/pagination";

export async function GET(request: Request) {
  let userId: string;
  try { ({ userId } = await requireApiUser()); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("AUTH_REQUIRED", "Debes iniciar sesión para consultar tu historial.", 401); throw error; }
  const items = await listPurchasedProductsForUser(userId);
  const { requestedPage, pageSize } = parsePagination(request, 100);
  const start = (Math.min(requestedPage, Math.max(1, Math.ceil(items.length / pageSize))) - 1) * pageSize;
  return NextResponse.json({ items: items.slice(start, start + pageSize), ...paginationMeta(requestedPage, pageSize, items.length) });
}
