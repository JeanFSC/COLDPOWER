import { createHash } from "node:crypto";
import type { QuoteTaxMode } from "@/lib/quote-contract";

export type CommercialLine = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  baseUnitPrice: string | null;
  discountPercentage: string | null;
  discountAmount: string | null;
  finalUnitPrice: string | null;
  lineTotal: string | null;
  currency: string | null;
  priceType: string | null;
  priceSourceId: string | null;
  priceReason?: string | null;
  discountStatus?: string | null;
};

export type QuoteTotals = {
  currency: string | null;
  subtotal: string | null;
  discountAmount: string | null;
  taxAmount: string | null;
  total: string | null;
};

export function money(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : null;
}

export function assertCurrency(currency: string | null | undefined) {
  if (!currency || !/^[A-Z]{3}$/.test(currency)) throw new Error("La cotización necesita una moneda ISO de tres letras.");
  return currency;
}

export function assertSingleCurrency(currencies: Array<string | null | undefined>) {
  const values = [...new Set(currencies.filter((value): value is string => Boolean(value)).map((value) => value.toUpperCase()))];
  if (values.length > 1) throw new Error("Una versión comercial no puede mezclar monedas.");
  return values[0] ?? null;
}

export function buildQuoteTotals(lines: CommercialLine[], taxAmount: string | number | null = null): QuoteTotals {
  const currency = assertSingleCurrency(lines.map((line) => line.currency));
  const priced = lines.filter((line) => line.baseUnitPrice !== null && line.finalUnitPrice !== null && line.lineTotal !== null);
  if (!priced.length || priced.length !== lines.length || !currency) return { currency, subtotal: null, discountAmount: null, taxAmount: money(taxAmount), total: null };
  const subtotal = priced.reduce((sum, line) => sum + Number(line.baseUnitPrice) * line.quantity, 0);
  const discount = priced.reduce((sum, line) => sum + Number(line.discountAmount ?? 0) * line.quantity, 0);
  const tax = Number(taxAmount ?? 0);
  const finalTotal = priced.reduce((sum, line) => sum + Number(line.lineTotal), 0) + tax;
  return { currency, subtotal: subtotal.toFixed(2), discountAmount: discount.toFixed(2), taxAmount: tax.toFixed(2), total: finalTotal.toFixed(2) };
}

export function validateQuoteTaxMode(value: unknown): QuoteTaxMode {
  if (value === "INCLUDED" || value === "EXCLUDED" || value === "UNCONFIGURED") return value;
  throw new Error("Debes definir si los precios incluyen impuestos.");
}

export function validateQuoteLine(line: Pick<CommercialLine, "quantity" | "baseUnitPrice" | "finalUnitPrice" | "lineTotal" | "currency">) {
  if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error("La cantidad debe ser un entero mayor que cero.");
  if (line.baseUnitPrice === null || line.finalUnitPrice === null || line.lineTotal === null) throw new Error("Producto sin precio comercial.");
  for (const value of [line.baseUnitPrice, line.finalUnitPrice, line.lineTotal]) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(String(value)) || Number(value) <= 0) throw new Error("El precio comercial no es válido.");
  }
  assertCurrency(line.currency);
}

export function snapshotHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value, (_, item) => item instanceof Date ? item.toISOString() : item)).digest("hex");
}

export function discountApprovalState(discountPercentage: string | number | null | undefined, approvalAbovePercentage: string | number | null | undefined, maxPercentage: string | number | null | undefined) {
  const discount = Number(discountPercentage ?? 0);
  const threshold = Number(approvalAbovePercentage ?? 0);
  const maximum = Number(maxPercentage ?? 100);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) return "BLOCKED" as const;
  if (discount > maximum) return "BLOCKED" as const;
  if (discount > threshold) return "PENDING" as const;
  return "NOT_REQUIRED" as const;
}
