import { DashboardInvalidFilterError, parseDashboardFilters, type DashboardFilters } from "@/lib/dashboard-contract";
export { DashboardInvalidFilterError };
export type ReportsFilters = DashboardFilters;
export function parseReportsFilters(params: URLSearchParams): ReportsFilters { return parseDashboardFilters(params); }
