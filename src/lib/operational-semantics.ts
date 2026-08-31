export type InventoryAvailability = {
  onHand: number;
  reserved: number;
  minimumStock: number | null;
};

export type PublicAvailability = {
  status: "UNKNOWN" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  available: number | null;
};

export function availabilityFromBalance(balance: InventoryAvailability | null | undefined): PublicAvailability {
  if (!balance) return { status: "UNKNOWN", available: null };
  const available = balance.onHand - balance.reserved;
  if (available <= 0) return { status: "OUT_OF_STOCK", available };
  if (balance.minimumStock !== null && available <= balance.minimumStock) return { status: "LOW_STOCK", available };
  return { status: "IN_STOCK", available };
}

export type PipelineMetricRow = {
  amount?: number | null;
  weightedValue?: number | null;
  status: "OPEN" | "WON" | "LOST" | "CANCELLED";
  overdueFollowup?: boolean;
};

export function calculatePipelineMetrics(rows: PipelineMetricRow[]) {
  const total = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const weightedValue = rows.reduce((sum, row) => sum + (row.weightedValue ?? 0), 0);
  const won = rows.filter((row) => row.status === "WON").length;
  const lost = rows.filter((row) => row.status === "LOST").length;
  const eligible = rows.filter((row) => row.status !== "CANCELLED").length;
  return {
    count: rows.length,
    total,
    weightedValue,
    won,
    lost,
    conversion: eligible > 0 ? won / eligible : null,
    overdueFollowups: rows.filter((row) => row.overdueFollowup).length,
  };
}

export function calculatePagination(page: number, pageSize: number, totalItems: number) {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / safePageSize));
  return { page: Math.min(Math.max(1, Math.floor(page)), totalPages), pageSize: safePageSize, totalItems: Math.max(0, totalItems), totalPages };
}

const sensitiveKey = /password|token|secret|credential|authorization|api[_-]?key/i;

export function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitiveKey.test(key)).map(([key, child]) => [key, sanitizeAuditValue(child)]));
}
