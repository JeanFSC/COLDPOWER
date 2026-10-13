import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { parseUserFilters, getUserPage, UserInvalidFilterError } from "@/lib/user-administration";
import { csvCell } from "@/lib/csv";
import { tabularWorkbook } from "@/lib/tabular-workbook";

const MAX_EXPORT_ITEMS = 5_000;

export async function GET(request: Request) {
  try {
    await requireApiPermission("users.export");
    const params = new URL(request.url).searchParams;
    const filters = parseUserFilters(params);
    const first = await getUserPage({ ...filters, page: 1, pageSize: 100 });
    const pages = Math.min(first.totalPages, Math.ceil(MAX_EXPORT_ITEMS / 100));
    const items = [...first.items];
    for (let page = 2; page <= pages && items.length < MAX_EXPORT_ITEMS; page += 1) items.push(...(await getUserPage({ ...filters, page, pageSize: 100 })).items);
    const truncated = first.totalItems > MAX_EXPORT_ITEMS;
    const limitedItems = items.slice(0, MAX_EXPORT_ITEMS);
    const headers = ["ID", "Nombre", "Correo", "Teléfono", "Rol", "Estado", "Último acceso", "Creado", "Actualizado", "Sincronización Clerk"];
    const values = limitedItems.map((item) => [item.id, item.name, item.email, item.phone, item.role, item.status, item.lastSignInAt?.toISOString() ?? "", item.createdAt.toISOString(), item.updatedAt.toISOString(), item.clerkSyncStatus]);
    if (truncated) values.push(["AVISO", `Exportación limitada a ${MAX_EXPORT_ITEMS} registros`, "", "", "", "", "", "", "", ""]);
    const csv = params.get("format") === "csv";
    return new Response(csv ? `\ufeff${[headers, ...values].map(row => row.map(csvCell).join(",")).join("\r\n")}` : Buffer.from(tabularWorkbook("Usuarios", headers, values)), { headers: { "content-type": csv ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="coldpower-usuarios.${csv ? "csv" : "xlsx"}"`, "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("USERS_EXPORT_FORBIDDEN", "No tienes permiso para exportar usuarios.", 403);
    if (error instanceof UserInvalidFilterError) return apiError("USERS_INVALID_FILTER", "Los filtros de usuarios no son válidos.", 400);
    return apiError("USERS_EXPORT_FAILED", "No se pudo exportar usuarios.", 503);
  }
}
