import { and, asc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { customers } from "@/db/crm-schema";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";

export async function GET(request: Request) {
  try {
    await requireApiPermission("customers.view");
    const params = new URL(request.url).searchParams;
    const query = params.get("q")?.trim().slice(0, 100) ?? "";
    const excludeId = params.get("exclude")?.trim().slice(0, 100) ?? "";
    if (query.length < 2) return apiSuccess({ items: [] });
    const escaped = query.replace(/[\\%_]/g, "\\$&");
    const pattern = `%${escaped}%`;
    const items = await getDb()
      .select({ id: customers.id, name: customers.name, reference: sql<string | null>`coalesce(${customers.ruc}, ${customers.documentNumber})` })
      .from(customers)
      .where(and(
        or(eq(customers.status, "ACTIVE"), eq(customers.status, "PROSPECT")),
        isNull(customers.canonicalCustomerId),
        ...(excludeId ? [ne(customers.id, excludeId)] : []),
        or(
          ilike(customers.name, pattern),
          ilike(customers.legalName, pattern),
          ilike(customers.ruc, pattern),
          ilike(customers.documentNumber, pattern),
          ilike(customers.email, pattern),
          ilike(customers.phone, pattern),
        ),
      ))
      .orderBy(asc(customers.name))
      .limit(20);
    return apiSuccess({ items });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CUSTOMERS_FORBIDDEN", "No tienes permiso para buscar clientes.", 403);
    return apiError("CUSTOMERS_UNAVAILABLE", "No se pudieron buscar clientes.", 503);
  }
}
