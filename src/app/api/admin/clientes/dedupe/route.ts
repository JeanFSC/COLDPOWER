import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { findCustomerDuplicates } from "@/lib/customer-operations-service";

export async function POST(request: Request) {
  try {
    await requireApiPermission("customers.manage");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const raw = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const text = (key: string) => typeof raw[key] === "string" ? raw[key]!.trim().slice(0, 180) || null : null;
    const excludeId = text("excludeId");
    const duplicates = await findCustomerDuplicates({
      name: text("name"),
      ruc: text("ruc"),
      documentNumber: text("documentNumber"),
      email: text("email"),
      phone: text("phone"),
      whatsapp: text("whatsapp"),
    }, excludeId ?? undefined);
    return apiSuccess({ duplicates });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CUSTOMERS_FORBIDDEN", "No tienes permiso para revisar duplicados.", 403);
    return apiError("CUSTOMER_DEDUPE_UNAVAILABLE", "No se pudo revisar posibles duplicados.", 503);
  }
}
