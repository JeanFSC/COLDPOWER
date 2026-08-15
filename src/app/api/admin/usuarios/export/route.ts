import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { parseUserFilters, getUserPage, UserInvalidFilterError } from "@/lib/user-administration";

function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET(request: Request) {
  try {
    await requireApiPermission("users.export");
    const filters = parseUserFilters(new URL(request.url).searchParams);
    const first = await getUserPage({ ...filters, page: 1, pageSize: 100 });
    const items = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) items.push(...(await getUserPage({ ...filters, page, pageSize: 100 })).items);
    const lines = [["ID", "Nombre", "Correo", "Teléfono", "Rol", "Estado", "Último acceso", "Creado", "Actualizado", "Sincronización Clerk"].map(csv).join(","), ...items.map((item) => [item.id, item.name, item.email, item.phone, item.role, item.status, item.lastSignInAt?.toISOString() ?? "", item.createdAt.toISOString(), item.updatedAt.toISOString(), item.clerkSyncStatus].map(csv).join(","))];
    return new Response(`\ufeff${lines.join("\r\n")}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=coldpower-usuarios.csv", "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("USERS_EXPORT_FORBIDDEN", "No tienes permiso para exportar usuarios.", 403);
    if (error instanceof UserInvalidFilterError) return apiError("USERS_INVALID_FILTER", "Los filtros de usuarios no son válidos.", 400);
    return apiError("USERS_EXPORT_FAILED", "No se pudo exportar usuarios.", 503);
  }
}
