import { csvText } from "@/lib/csv";
import * as XLSX from "xlsx";
import type { DashboardActor } from "@/lib/operations-dashboard";
import { can } from "@/lib/roles";

type DashboardSnapshot = Awaited<ReturnType<typeof import("@/lib/operations-dashboard").getOperationsDashboard>>;

function escapeCsv(value: unknown) {
  const text = csvText(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toDashboardCsv(data: DashboardSnapshot, actor?: DashboardActor) {
  const rows: unknown[][] = [
    ["contexto", "rango", data.filters.range ?? "month"],
    ["contexto", "moneda", data.currency ?? "N/D"],
    ["contexto", "desde", data.filters.from ?? ""],
    ["contexto", "hasta", data.filters.to ?? ""],
    ["sección", "indicador", "valor"],
    ["resumen", "ventas confirmadas", data.sales],
    ["resumen", "ingresos reconocidos", data.revenue],
    ["resumen", "cotizaciones abiertas", data.quotes],
    ["resumen", "pedidos activos", data.orders.total],
    ["resumen", "stock crítico", data.criticalStock],
    ["resumen", "stock desconocido", data.unknownStock],
  ];
  const canViewFinancials = Boolean(actor && can(actor.role, "pricing.cost.view") && can(actor.role, "pricing.margin.view"));
  if (canViewFinancials) {
    rows.push(["finanzas", "costo de ventas", data.costOfSales], ["finanzas", "utilidad bruta", data.grossProfit], ["finanzas", "margen bruto", data.grossMargin], ["finanzas", "gastos operativos", data.operatingExpenses], ["finanzas", "utilidad operativa", data.operatingProfit], ["finanzas", "rentabilidad", data.profitability]);
  }
  rows.push(["serie", "fecha", "total", "ventas", "pedidos", "unidades"]);
  for (const point of data.salesSeries) rows.push(["serie", point.date, point.total, point.count, point.orders ?? 0, point.units ?? 0]);
  rows.push(["pipeline", "etapa", "cantidad", "importe", "valor ponderado"]);
  for (const stage of data.pipelineSummary) rows.push(["pipeline", stage.stageLabel ?? stage.stage, stage.count, stage.amount, stage.weightedValue]);
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

export function dashboardHasExportableData(data: DashboardSnapshot) {
  return data.salesRange.count > 0 || data.quotes > 0 || data.orders.total > 0 || data.opportunities > 0 || data.recentActivity.length > 0;
}

export function toDashboardWorkbook(data: DashboardSnapshot, actor?: DashboardActor) {
  const book = XLSX.utils.book_new();
  const summary: unknown[][] = [
    ["Indicador", "Valor"],
    ["Ventas confirmadas", data.sales],
    ["Ingresos reconocidos", data.revenue],
    ["Cotizaciones abiertas", data.quotes],
    ["Pedidos activos", data.orders.total],
    ["Stock crítico", data.criticalStock],
    ["Stock desconocido", data.unknownStock],
  ];
  if (actor && can(actor.role, "pricing.cost.view") && can(actor.role, "pricing.margin.view")) {
    summary.push(["Costo de ventas", data.costOfSales], ["Utilidad bruta", data.grossProfit], ["Margen bruto", data.grossMargin], ["Gastos operativos", data.operatingExpenses], ["Utilidad operativa", data.operatingProfit], ["Rentabilidad", data.profitability]);
  }
  const sheets: [string, unknown[][]][] = [
    ["Contexto", [["Filtro", "Valor"], ["Rango", data.filters.range ?? "month"], ["Moneda", data.currency ?? "N/D"], ["Desde", data.filters.from ?? ""], ["Hasta", data.filters.to ?? ""]]],
    ["Resumen", summary],
    ["Serie", [["Fecha", "Total", "Ventas", "Pedidos", "Unidades"], ...data.salesSeries.map(point => [point.date, point.total, point.count, point.orders ?? 0, point.units ?? 0])]],
    ["Pipeline", [["Etapa", "Cantidad", "Importe", "Valor ponderado"], ...data.pipelineSummary.map(stage => [stage.stageLabel ?? stage.stage, stage.count, stage.amount, stage.weightedValue])]],
  ];
  for (const [name, rows] of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(rows.map(row => row.map(value => value ?? "")));
    sheet["!cols"] = rows[0].map((_, index) => ({ wch: index === 0 ? 30 : 22 }));
    sheet["!autofilter"] = { ref: sheet["!ref"]! };
    XLSX.utils.book_append_sheet(book, sheet, name);
  }
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
