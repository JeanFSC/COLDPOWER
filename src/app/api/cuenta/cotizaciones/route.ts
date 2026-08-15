import { count, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { quotes } from "@/db/schema";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { paginationMeta, parsePagination } from "@/lib/pagination";

export async function GET(request: Request) {
  let userId: string;
  try { ({ userId } = await requireApiUser()); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("AUTH_REQUIRED", "Debes iniciar sesión para consultar tus cotizaciones.", 401); throw error; }
  const { requestedPage, pageSize } = parsePagination(request, 50);
  const where = eq(quotes.userId, userId);
  const [rows, [{ total }]] = await Promise.all([
    getDb().select().from(quotes).where(where).orderBy(desc(quotes.createdAt)).limit(pageSize).offset((requestedPage - 1) * pageSize),
    getDb().select({ total: count() }).from(quotes).where(where),
  ]);
  return NextResponse.json({ items: rows, ...paginationMeta(requestedPage, pageSize, Number(total ?? 0)) });
}
