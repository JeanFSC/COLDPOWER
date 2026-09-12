import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { addCustomerAddress, addCustomerContact, addCustomerNote, CustomerOperationsError } from "@/lib/customer-operations-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("customers.manage");
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const raw = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const kind = raw.kind;
    if (kind === "contact") return apiSuccess({ contact: await addCustomerContact(id, {
      name: typeof raw.name === "string" ? raw.name : "", role: typeof raw.role === "string" ? raw.role : null,
      email: typeof raw.email === "string" ? raw.email : null, phone: typeof raw.phone === "string" ? raw.phone : null,
      whatsapp: typeof raw.whatsapp === "string" ? raw.whatsapp : null, isPrimary: raw.isPrimary === true,
    }, actor) }, 201);
    if (kind === "address") return apiSuccess({ address: await addCustomerAddress(id, {
      label: typeof raw.label === "string" ? raw.label : "", address: typeof raw.address === "string" ? raw.address : "",
      country: typeof raw.country === "string" ? raw.country : null, department: typeof raw.department === "string" ? raw.department : null,
      province: typeof raw.province === "string" ? raw.province : null, district: typeof raw.district === "string" ? raw.district : null,
      isPrimary: raw.isPrimary === true,
    }, actor) }, 201);
    if (kind === "note") return apiSuccess({ note: await addCustomerNote(id, typeof raw.body === "string" ? raw.body : "", actor) }, 201);
    return apiError("CUSTOMER_RELATION_INVALID", "La relación debe ser contacto, dirección o nota.", 422);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CUSTOMERS_FORBIDDEN", "No tienes permiso para actualizar relaciones del cliente.", 403);
    if (error instanceof CustomerOperationsError) return apiError(error.code, error.message, error.status, error.details);
    return apiError("CUSTOMER_RELATION_FAILED", "No se pudo guardar la relación del cliente.", 503);
  }
}
