type CalendarStatus = { effectiveStatus: string; approvalStatus: string };

export const promotionCalendarStates = {
  ACTIVE: { label: "Activa", color: "bg-emerald-600" },
  SCHEDULED: { label: "Programada", color: "bg-blue-600" },
  PENDING: { label: "Por aprobar", color: "bg-orange-600" },
  DRAFT: { label: "Borrador", color: "bg-slate-400" },
  INACTIVE: { label: "Pausada", color: "bg-violet-600" },
  EXPIRED: { label: "Vencida", color: "bg-slate-700" },
} as const;

export function promotionCalendarPresentation(item: CalendarStatus) {
  if (item.effectiveStatus === "INACTIVE") return promotionCalendarStates.INACTIVE;
  if (item.effectiveStatus === "EXPIRED") return promotionCalendarStates.EXPIRED;
  if (item.approvalStatus === "PENDING") return promotionCalendarStates.PENDING;
  return promotionCalendarStates[item.effectiveStatus as keyof typeof promotionCalendarStates] ?? promotionCalendarStates.DRAFT;
}

export function promotionExportHref(href: string, format: "xlsx" | "csv") {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("format", format);
  return `${path}?${params.toString()}`;
}
