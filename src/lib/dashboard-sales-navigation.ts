import { parseDashboardFilters, type DashboardFilters, type DashboardGranularity } from "@/lib/dashboard-contract";

export type DashboardSalesScope = { filters: DashboardFilters; from: string; to: string; currency?: string };

export function dashboardSalesHref(filters: DashboardFilters, point: string, granularity: DashboardGranularity, range: { from: Date; to: Date }, currency?: string) {
  const start = new Date(`${point}${granularity === "hour" ? ":00-05:00" : "T00:00:00-05:00"}`);
  const end = new Date(start);
  if (granularity === "month") end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setTime(start.getTime() + (granularity === "week" ? 7 * 86400000 : granularity === "hour" ? 3600000 : 86400000));
  const from = new Date(Math.max(start.getTime(), range.from.getTime()));
  const to = new Date(Math.min(end.getTime(), range.to.getTime()));
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) throw new Error("INVALID_DASHBOARD_SALES_WINDOW");
  const day = (date: Date) => new Date(date.getTime() - 5 * 3600000).toISOString().slice(0, 10);
  const query = new URLSearchParams({ createdFrom: day(from), createdTo: day(new Date(to.getTime() - 1)), status: "CONFIRMED" });
  if (filters.customerId) query.set("customerId", filters.customerId);
  if (filters.sellerId) query.set("sellerId", filters.sellerId);
  if (currency) query.set("currency", currency);
  query.set("dashboardScope", JSON.stringify({ filters, from: from.toISOString(), to: to.toISOString(), currency }));
  return `/admin/ventas?${query}`;
}

export function parseDashboardSalesScope(raw: string | null): DashboardSalesScope | undefined {
  if (raw === null) return undefined;
  if (raw.length > 8192) throw new Error("INVALID_DASHBOARD_SALES_SCOPE");
  const value = JSON.parse(raw) as DashboardSalesScope;
  if (!value || typeof value !== "object" || !value.filters || typeof value.filters !== "object") throw new Error("INVALID_DASHBOARD_SALES_SCOPE");
  const query = new URLSearchParams();
  for (const [key, entry] of Object.entries(value.filters)) {
    if (typeof entry !== "string") throw new Error("INVALID_DASHBOARD_SALES_SCOPE");
    query.set(key, entry);
  }
  const filters = parseDashboardFilters(query);
  for (const date of [value.from, value.to]) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(date) || new Date(date).toISOString() !== date) throw new Error("INVALID_DASHBOARD_SALES_SCOPE");
  }
  if (value.from >= value.to || (value.currency !== undefined && typeof value.currency !== "string")) throw new Error("INVALID_DASHBOARD_SALES_SCOPE");
  return { filters, from: value.from, to: value.to, currency: value.currency };
}
