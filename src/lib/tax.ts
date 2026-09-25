export type ProductTaxType = "GRAVADO" | "EXONERADO" | "INAFECTO" | string;
export type TaxCalculationMode = "INCLUDED" | "EXCLUDED" | "UNCONFIGURED";
export type TaxConfiguration = { rate: string | number | null | undefined; mode: TaxCalculationMode | null | undefined };

export type TaxBreakdown = {
  status: "CONFIGURED" | "UNCONFIGURED";
  mode: TaxCalculationMode;
  rate: string | null;
  taxableOperation: string | null;
  igv: string | null;
  total: string | null;
  note: string;
};

export const TAX_CONFIGURATION_MISSING_NOTE =
  "La tasa y la modalidad tributaria de la empresa aún no están configuradas.";

export function unconfiguredTaxBreakdown(): TaxBreakdown {
  return {
    status: "UNCONFIGURED",
    mode: "UNCONFIGURED",
    rate: null,
    taxableOperation: null,
    igv: null,
    total: null,
    note: TAX_CONFIGURATION_MISSING_NOTE,
  };
}

export function isTaxConfigurationComplete(configuration: TaxConfiguration): configuration is { rate: string | number; mode: Exclude<TaxCalculationMode, "UNCONFIGURED"> } {
  const rate = Number(configuration.rate);
  return configuration.rate !== null && configuration.rate !== undefined && configuration.rate !== "" && Number.isFinite(rate) && rate >= 0 && rate <= 100 && (configuration.mode === "INCLUDED" || configuration.mode === "EXCLUDED");
}

export function calculateTaxBreakdown(input: {
  amount: string | number;
  taxType: ProductTaxType | null | undefined;
  rate: string | number | null | undefined;
  mode: Exclude<TaxCalculationMode, "UNCONFIGURED"> | "UNCONFIGURED";
}): TaxBreakdown {
  const amount = Number(input.amount);
  const rate = Number(input.rate);
  if (!Number.isFinite(amount) || amount < 0 || input.rate === null || input.rate === undefined || input.rate === "" || !Number.isFinite(rate) || rate < 0 || input.mode === "UNCONFIGURED") {
    return unconfiguredTaxBreakdown();
  }

  const normalizedType = String(input.taxType ?? "").trim().toUpperCase();
  if (normalizedType === "EXONERADO" || normalizedType === "INAFECTO") {
    return {
      status: "CONFIGURED",
      mode: input.mode,
      rate: rate.toFixed(2),
      taxableOperation: "0.00",
      igv: "0.00",
      total: amount.toFixed(2),
      note: normalizedType === "EXONERADO" ? "Producto exonerado de IGV." : "Producto inafecto de IGV.",
    };
  }

  const base = input.mode === "INCLUDED" ? amount / (1 + rate / 100) : amount;
  const igv = input.mode === "INCLUDED" ? amount - base : amount * (rate / 100);
  const total = input.mode === "INCLUDED" ? amount : amount + igv;
  return {
    status: "CONFIGURED",
    mode: input.mode,
    rate: rate.toFixed(2),
    taxableOperation: base.toFixed(2),
    igv: igv.toFixed(2),
    total: total.toFixed(2),
    note: "",
  };
}

export function calculateTaxBreakdownForLines(input: {
  lines: Array<{ amount: string | number; taxType?: ProductTaxType | null }>;
  configuration: TaxConfiguration;
}): TaxBreakdown {
  if (!isTaxConfigurationComplete(input.configuration)) return unconfiguredTaxBreakdown();
  const mode = input.configuration.mode as Exclude<TaxCalculationMode, "UNCONFIGURED">;
  const breakdowns = input.lines.map((line) => calculateTaxBreakdown({
    amount: line.amount,
    taxType: line.taxType ?? "GRAVADO",
    rate: input.configuration.rate,
    mode,
  }));
  if (!breakdowns.length || breakdowns.some((breakdown) => breakdown.status !== "CONFIGURED")) return unconfiguredTaxBreakdown();
  const sum = (field: "taxableOperation" | "igv" | "total") => breakdowns.reduce((total, breakdown) => total + Number(breakdown[field] ?? 0), 0).toFixed(2);
  return {
    status: "CONFIGURED",
    mode,
    rate: Number(input.configuration.rate).toFixed(2),
    taxableOperation: sum("taxableOperation"),
    igv: sum("igv"),
    total: sum("total"),
    note: "",
  };
}

export function taxBreakdownFromSnapshot(input: {
  subtotal: string | number | null | undefined;
  discountAmount: string | number | null | undefined;
  total: string | number | null | undefined;
  taxAmount: string | number | null | undefined;
  taxRate: string | number | null | undefined;
  taxMode: string | null | undefined;
}): TaxBreakdown {
  if (input.taxMode !== "INCLUDED" && input.taxMode !== "EXCLUDED") return unconfiguredTaxBreakdown();
  const total = Number(input.total);
  const taxAmount = Number(input.taxAmount);
  const rate = Number(input.taxRate);
  if (![total, taxAmount, rate].every(Number.isFinite) || total < 0 || taxAmount < 0 || rate < 0) return unconfiguredTaxBreakdown();
  const net = Math.max(0, Number(input.subtotal ?? 0) - Number(input.discountAmount ?? 0));
  return {
    status: "CONFIGURED",
    mode: input.taxMode as Exclude<TaxCalculationMode, "UNCONFIGURED">,
    rate: rate.toFixed(2),
    taxableOperation: (input.taxMode === "INCLUDED" ? total - taxAmount : net).toFixed(2),
    igv: taxAmount.toFixed(2),
    total: total.toFixed(2),
    note: "",
  };
}
