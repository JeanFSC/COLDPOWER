import type { PricingListResponse } from "@/lib/pricing-contract";

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toPricingCsv(data: PricingListResponse, canViewCost: boolean) {
  const rows: unknown[][] = [["sku", "producto", "categoría", "familia", "marca", "tipo", "importe", "moneda", "estado", "vigencia desde", "vigencia hasta"]];
  for (const item of data.items) {
    const prices = item.prices?.length ? item.prices : [item.price];
    for (const price of prices) {
      const priceType = price?.priceType ?? item.priceType;
      if (priceType === "COST" && !canViewCost) continue;
      rows.push([
        item.sku,
        item.productName,
        item.categoryName,
        item.familyName,
        item.brandName,
        priceType ?? "",
        price?.amount ?? item.amount ?? "",
        price?.currency ?? item.currency ?? "",
        price?.status ?? item.status ?? (price ? "ACTIVE" : "SIN_PRECIO"),
        price?.validFrom?.toISOString() ?? "",
        price?.validUntil?.toISOString() ?? "",
      ]);
    }
  }
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}
