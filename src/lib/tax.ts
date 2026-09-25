export type ProductTaxType = "GRAVADO" | "EXONERADO" | "INAFECTO" | string;
export type TaxCalculationMode = "INCLUDED" | "EXCLUDED" | "UNCONFIGURED";

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
