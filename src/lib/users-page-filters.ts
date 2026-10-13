import { parseUserFilters, UserInvalidFilterError, type UserFilters } from "@/lib/user-administration";

export function resolveUsersPageFilters(incoming: URLSearchParams) {
  let filters: UserFilters;
  let filterNotice: string | undefined;
  try { filters = parseUserFilters(incoming); }
  catch (error) {
    if (!(error instanceof UserInvalidFilterError)) throw error;
    filters = {};
    filterNotice = "Los filtros de usuarios no eran válidos y se restablecieron. La lista y la exportación usan el alcance sin filtros.";
  }
  const exportQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && key !== "page" && key !== "pageSize") exportQuery.set(key, String(value));
  }
  return { filters, filterNotice, exportHref: `/api/admin/usuarios/export${exportQuery.size ? `?${exportQuery}` : ""}` };
}
