export const operationsRanges = ["all", "today", "yesterday", "week", "month", "custom"] as const;
export type OperationsRange = (typeof operationsRanges)[number];

export const operationsQueues = [
  "quotes",
  "opportunities",
  "orders",
  "followUps",
  "inventoryAlerts",
] as const;
export type OperationsQueue = (typeof operationsQueues)[number];

export type OperationsFilters = {
  range: OperationsRange;
  from?: string;
  to?: string;
  locationId?: string;
  sellerId?: string;
  status?: string;
  team?: "VENTAS" | "OPERACIONES" | "ALMACEN";
  assigneeId?: string;
  urgency?: "LOW" | "NORMAL" | "MEDIUM" | "HIGH" | "CRITICAL";
  sla?: "NO_POLICY" | "ON_TRACK" | "DUE_SOON" | "OVERDUE";
  queue?: OperationsQueue;
  page: number;
  pageSize: number;
  fromAt?: Date;
  toAt?: Date;
};

export class OperationsInvalidFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationsInvalidFilterError";
  }
}

function positiveInteger(value: string | null, fallback: number, max: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new OperationsInvalidFilterError("El valor de paginación no es válido.");
  }
  return parsed;
}

function validDate(value: string | null | undefined, field: string) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new OperationsInvalidFilterError(`La fecha ${field} debe tener formato YYYY-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00.000-05:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new OperationsInvalidFilterError(`La fecha ${field} no es válida.`);
  }
  return parsed;
}

function limaDate(offsetDays: number) {
  const now = new Date();
  const lima = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }));
  lima.setHours(0, 0, 0, 0);
  lima.setDate(lima.getDate() + offsetDays);
  const year = lima.getFullYear();
  const month = String(lima.getMonth() + 1).padStart(2, "0");
  const day = String(lima.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLimaTodayBounds() {
  const from = new Date(`${limaDate(0)}T00:00:00.000-05:00`);
  const to = new Date(`${limaDate(1)}T00:00:00.000-05:00`);
  return { from, to };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Produces adjacent, equally sized windows for KPI comparisons. */
export function getOperationsComparisonPeriods(filters: OperationsFilters) {
  const today = getLimaTodayBounds();
  const usesRollingWindow = !filters.fromAt || !filters.toAt;
  const currentFrom = usesRollingWindow
    ? new Date(today.from.getTime() - 29 * DAY_MS)
    : filters.fromAt!;
  const currentTo = usesRollingWindow ? today.from : filters.toAt!;
  const durationDays = Math.max(
    1,
    Math.round((currentTo.getTime() - currentFrom.getTime()) / DAY_MS) + 1,
  );
  const previousTo = new Date(currentFrom.getTime() - DAY_MS);
  const previousFrom = new Date(previousTo.getTime() - (durationDays - 1) * DAY_MS);
  const base = { ...filters, range: "custom" as const, page: 1 };
  return {
    current: { ...base, fromAt: currentFrom, toAt: currentTo },
    previous: { ...base, fromAt: previousFrom, toAt: previousTo },
    label: usesRollingWindow ? "vs. 30 días anteriores" : "vs. periodo anterior",
  };
}

function rangeDates(range: OperationsRange) {
  if (range === "today") return { from: limaDate(0), to: limaDate(0) };
  if (range === "yesterday") return { from: limaDate(-1), to: limaDate(-1) };
  if (range === "week") return { from: limaDate(-6), to: limaDate(0) };
  if (range === "month") return { from: limaDate(-29), to: limaDate(0) };
  return {};
}

export function parseOperationsFilters(params: URLSearchParams): OperationsFilters {
  const rawRange = params.get("range") ?? "all";
  if (!operationsRanges.includes(rawRange as OperationsRange)) {
    throw new OperationsInvalidFilterError("El rango operativo no es válido.");
  }
  const range = rawRange as OperationsRange;
  const rangeDefaults = rangeDates(range);
  const from = params.get("from") ?? rangeDefaults.from;
  const to = params.get("to") ?? rangeDefaults.to;
  const fromAt = validDate(from, "from");
  const toAt = validDate(to, "to");
  if (fromAt && toAt && fromAt > toAt) {
    throw new OperationsInvalidFilterError("El inicio del rango no puede ser posterior al final.");
  }
  const rawQueue = params.get("queue") ?? undefined;
  if (rawQueue && !operationsQueues.includes(rawQueue as OperationsQueue)) {
    throw new OperationsInvalidFilterError("La cola operativa no es válida.");
  }
  const status = params.get("status")?.trim() || undefined;
  if (status && status.length > 64)
    throw new OperationsInvalidFilterError("El estado operativo no es válido.");
  const team = params.get("team")?.trim() || undefined;
  if (team && !["VENTAS", "OPERACIONES", "ALMACEN"].includes(team))
    throw new OperationsInvalidFilterError("El equipo operativo no es válido.");
  const urgency = params.get("urgency")?.trim() || undefined;
  if (urgency && !["LOW", "NORMAL", "MEDIUM", "HIGH", "CRITICAL"].includes(urgency))
    throw new OperationsInvalidFilterError("La urgencia operativa no es válida.");
  const sla = params.get("sla")?.trim() || undefined;
  if (sla && !["NO_POLICY", "ON_TRACK", "DUE_SOON", "OVERDUE"].includes(sla))
    throw new OperationsInvalidFilterError("El estado SLA no es válido.");
  return {
    range,
    from,
    to,
    fromAt,
    toAt,
    locationId: params.get("locationId")?.trim() || undefined,
    sellerId: params.get("sellerId")?.trim() || undefined,
    status,
    team: team as OperationsFilters["team"],
    assigneeId: params.get("assigneeId")?.trim() || undefined,
    urgency: urgency as OperationsFilters["urgency"],
    sla: sla as OperationsFilters["sla"],
    queue: rawQueue as OperationsQueue | undefined,
    page: positiveInteger(params.get("page"), 1, 100000),
    pageSize: positiveInteger(params.get("pageSize"), 25, 1000),
  };
}

export function operationsFiltersFromParams(input: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) if (value) params.set(key, value);
  return parseOperationsFilters(params);
}
