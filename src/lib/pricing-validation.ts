const priceTypes = ["COST", "RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL"] as const;
export type PriceType = (typeof priceTypes)[number];
const priceStatuses = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type PriceStatus = (typeof priceStatuses)[number];

function decimal(value: unknown, label: string, { allowZero = false } = {}) {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error(`${label} debe tener hasta dos decimales.`);
  const numberValue = Number(raw);
  if (!Number.isFinite(numberValue) || (allowZero ? numberValue < 0 : numberValue <= 0)) throw new Error(`${label} debe ser mayor que cero.`);
  return numberValue.toFixed(2);
}

export function normalizePriceInput(input: { amount?: unknown; currency?: unknown; priceType?: unknown }) {
  const currency = typeof input.currency === "string" ? input.currency.trim().toUpperCase() : "";
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("La moneda debe ser un código ISO de tres letras.");
  if (typeof input.priceType !== "string" || !(priceTypes as readonly string[]).includes(input.priceType)) throw new Error("Tipo de precio inválido.");
  return { amount: decimal(input.amount, "El importe"), currency, priceType: input.priceType as PriceType };
}

export function normalizePriceDetails(input: { amount?: unknown; currency?: unknown; priceType?: unknown; wholesaleMinQty?: unknown; minimumAllowed?: unknown; status?: unknown }) {
  const base = normalizePriceInput(input);
  const wholesaleMinQty = input.wholesaleMinQty === undefined || input.wholesaleMinQty === null || input.wholesaleMinQty === "" ? null : Number(input.wholesaleMinQty);
  if (wholesaleMinQty !== null && (!Number.isInteger(wholesaleMinQty) || wholesaleMinQty <= 0)) throw new Error("La cantidad mayorista debe ser un entero positivo.");
  const minimumAllowed = input.minimumAllowed === undefined || input.minimumAllowed === null || input.minimumAllowed === "" ? null : decimal(input.minimumAllowed, "El mínimo permitido");
  if (minimumAllowed !== null && Number(minimumAllowed) > Number(base.amount)) throw new Error("El mínimo permitido no puede superar el precio.");
  const status = input.status === undefined || input.status === null || input.status === "" ? "ACTIVE" : input.status;
  if (typeof status !== "string" || !(priceStatuses as readonly string[]).includes(status)) throw new Error("Estado de precio inválido.");
  return { ...base, wholesaleMinQty, minimumAllowed, status: status as PriceStatus };
}

export function validateDiscountInput(input: { name?: unknown; maxPercentage?: unknown; approvalAbovePercentage?: unknown }) {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  if (!name) throw new Error("El nombre de la regla es obligatorio.");
  const maxPercentage = decimal(input.maxPercentage, "El porcentaje máximo", { allowZero: true });
  const approvalAbovePercentage = decimal(input.approvalAbovePercentage, "El porcentaje de aprobación", { allowZero: true });
  if (Number(maxPercentage) > 100 || Number(approvalAbovePercentage) > 100) throw new Error("El porcentaje debe estar entre 0 y 100.");
  if (Number(approvalAbovePercentage) < Number(maxPercentage)) throw new Error("La aprobación debe ser igual o superior al máximo permitido.");
  return { name, maxPercentage, approvalAbovePercentage };
}

export function isPriceType(value: unknown): value is PriceType {
  return typeof value === "string" && (priceTypes as readonly string[]).includes(value);
}
