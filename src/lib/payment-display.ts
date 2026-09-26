const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  mock: "Pasarela de prueba",
  "development-gateway": "Pasarela de prueba",
  development_fixture: "Pasarela de prueba",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  DEBIT_CARD: "Tarjeta de débito",
  CREDIT_CARD: "Tarjeta de crédito",
  YAPE: "Yape",
  PLIN: "Plin",
  CASH: "Efectivo",
  DEPOSIT: "Depósito",
  PROVIDER: "Proveedor de pagos",
  MANUAL: "Registro manual",
  DEVELOPMENT_FIXTURE: "Pasarela de prueba",
  UNCONFIGURED: "Por configurar",
  OTHER: "Otro",
};

function normalizeKey(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function humanize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

/** Returns the stable grouping key used by every payment metric. */
export function paymentMethodKey(value: string | null | undefined) {
  const normalized = normalizeKey(value);
  if (!normalized) return "UNCONFIGURED";
  if (normalized === "TRANSFERENCIA" || normalized === "BANK_TRANSFER") return "TRANSFER";
  if (normalized === "MOCK" || normalized === "DEVELOPMENT_GATEWAY" || normalized === "DEVELOPMENT_FIXTURE") {
    return "DEVELOPMENT_FIXTURE";
  }
  return normalized;
}

export function paymentMethodLabel(value: string | null | undefined) {
  const key = paymentMethodKey(value);
  return PAYMENT_METHOD_LABELS[key] ?? (value?.trim() ? humanize(value.trim()) : PAYMENT_METHOD_LABELS.UNCONFIGURED);
}

export type PaymentMethodCountRow = { method: string; count: number };

export function groupPaymentMethodCounts(rows: PaymentMethodCountRow[]) {
  const groups = new Map<string, PaymentMethodCountRow>();
  for (const row of rows) {
    const method = paymentMethodKey(row.method);
    const current = groups.get(method);
    if (current) current.count += Number(row.count) || 0;
    else groups.set(method, { method, count: Number(row.count) || 0 });
  }
  return [...groups.values()];
}

export type PaymentMethodAmountRow = { method: string; amount: number; count: number };

export function groupPaymentMethodAmounts(rows: PaymentMethodAmountRow[]) {
  const groups = new Map<string, PaymentMethodAmountRow>();
  for (const row of rows) {
    const method = paymentMethodKey(row.method);
    const current = groups.get(method);
    if (current) {
      current.amount += Number(row.amount) || 0;
      current.count += Number(row.count) || 0;
    } else {
      groups.set(method, { method, amount: Number(row.amount) || 0, count: Number(row.count) || 0 });
    }
  }
  return [...groups.values()].sort((left, right) => right.amount - left.amount);
}

export type PaymentMethodBreakdownAmount = { currency: string; gross: number; refunded: number; net: number };
export type PaymentMethodBreakdownRow = { method: string; count: number; confirmedAmountsByCurrency: PaymentMethodBreakdownAmount[] };

export function groupPaymentMethodBreakdown(rows: PaymentMethodBreakdownRow[]) {
  const groups = new Map<string, PaymentMethodBreakdownRow>();
  for (const row of rows) {
    const method = paymentMethodKey(row.method);
    const current = groups.get(method) ?? { method, count: 0, confirmedAmountsByCurrency: [] };
    current.count += Number(row.count) || 0;
    for (const amount of row.confirmedAmountsByCurrency) {
      const existing = current.confirmedAmountsByCurrency.find((item) => item.currency === amount.currency);
      if (existing) {
        existing.gross += Number(amount.gross) || 0;
        existing.refunded += Number(amount.refunded) || 0;
        existing.net += Number(amount.net) || 0;
      } else {
        current.confirmedAmountsByCurrency.push({
          currency: amount.currency,
          gross: Number(amount.gross) || 0,
          refunded: Number(amount.refunded) || 0,
          net: Number(amount.net) || 0,
        });
      }
    }
    groups.set(method, current);
  }
  return [...groups.values()];
}

function stableHexFromId(id: string) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Uses a persisted commercial code when supplied, otherwise a deterministic hex fragment. */
export function paymentCode(id: string, commercialCode?: string | null) {
  const code = commercialCode?.trim();
  if (code) return code;
  const fragments = id.trim().match(/[0-9a-f]{6,}/gi);
  return `PAGO-${(fragments?.at(-1) ?? stableHexFromId(id.trim())).slice(-8).toUpperCase()}`;
}

export function paymentProviderLabel(value: string | null | undefined) {
  if (!value) return "Manual";
  return PAYMENT_PROVIDER_LABELS[value.trim().toLowerCase()] ?? humanize(value.trim());
}

export function paymentReferenceLabel(value: string | null | undefined) {
  if (!value) return "N/D";
  return /^mock[_-]/i.test(value.trim()) ? "Referencia de pasarela de prueba" : value;
}

export function paymentStatusLabel(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "CONFIRMED") return "confirmado";
  if (normalized === "APPROVED") return "aprobado";
  if (normalized === "PENDING" || normalized === "UNDER_REVIEW") return "pendiente de revisión";
  if (normalized === "REJECTED" || normalized === "ERROR") return "rechazado";
  if (normalized === "REFUNDED") return "reembolsado";
  if (normalized === "CANCELLED") return "cancelado";
  return value?.trim().toLowerCase() || "registrado";
}
