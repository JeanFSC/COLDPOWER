import { AuditInvalidFilterError, parseAuditFilters, type AuditFilters } from "@/lib/audit-contract";

export function resolveAuditPageFilters(incoming: URLSearchParams) {
  let filters: AuditFilters;
  let filterNotice: string | undefined;
  try { filters = parseAuditFilters(incoming); }
  catch (error) {
    if (!(error instanceof AuditInvalidFilterError)) throw error;
    filters = {};
    filterNotice = "Los filtros de auditoría no eran válidos y se restablecieron. La lista y la exportación usan el alcance sin filtros.";
  }
  const base = new URLSearchParams();
  const exported = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && key !== "page") {
    base.set(key, String(value));
    if (key !== "pageSize") exported.set(key, String(value));
  }
  return { filters, filterNotice, baseQuery: base.toString(), exportHref: `/api/admin/auditoria/export${exported.size ? `?${exported}` : ""}` };
}
