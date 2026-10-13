import { csvText } from "@/lib/csv";
import { tabularWorkbook, type WorkbookValue } from "@/lib/tabular-workbook";
import type { PricingListResponse } from "@/lib/pricing-contract";

function escapeCsv(value: unknown) {
  const text = csvText(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function pricingRows(data: PricingListResponse, canViewCost: boolean) {
  const rows: WorkbookValue[][] = [["sku", "producto", "categoría", "familia", "marca", "tipo", "importe", "moneda", "estado", "vigencia desde", "vigencia hasta"]];
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
        price?.validFrom ? new Date(price.validFrom).toISOString() : "",
        price?.validUntil ? new Date(price.validUntil).toISOString() : "",
      ]);
    }
  }
  return rows;
}

export function toPricingCsv(data: PricingListResponse, canViewCost: boolean) {
  return `\uFEFF${pricingRows(data, canViewCost).map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

export function toPricingWorkbook(data: PricingListResponse, canViewCost: boolean) {
  const [header, ...rows] = pricingRows(data, canViewCost);
  return tabularWorkbook("Precios", header as string[], rows.map(row => row.map((value, index) => index === 6 && value !== "" && value !== null && value !== undefined ? Number(value) : value)));
}
