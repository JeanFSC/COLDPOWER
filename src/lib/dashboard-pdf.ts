import type { DashboardActor } from "@/lib/operations-dashboard";
import { can } from "@/lib/roles";

type DashboardSnapshot = Awaited<ReturnType<typeof import("@/lib/operations-dashboard").getOperationsDashboard>>;

type ReportSection = { heading: string; lines: string[] };

function money(value: number | null | undefined, currency: string | null) {
  if (value === null || value === undefined || !currency || !Number.isFinite(value)) return "N/D";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function buildDashboardReportSections(data: DashboardSnapshot, actor?: DashboardActor): ReportSection[] {
  const canViewFinancials = Boolean(actor && can(actor.role, "pricing.cost.view") && can(actor.role, "pricing.margin.view"));
  const sections: ReportSection[] = [];

  sections.push({
    heading: "Indicadores clave",
    lines: [
      `Ventas confirmadas: ${money(data.salesRange.total, data.currency)}`,
      canViewFinancials
        ? `Margen bruto: ${money(data.grossProfit, data.currency)}${data.grossMargin !== null ? ` (${(data.grossMargin * 100).toFixed(1)}% de margen)` : ""}`
        : null,
      canViewFinancials ? `Cobrado: ${money(data.collected, data.currency)} (pagos confirmados menos reembolsos)` : null,
      `Pedidos activos: ${data.orders.total}`,
      `Conversión comercial: ${data.conversion.percentage !== null ? `${data.conversion.percentage.toFixed(1)}%` : "N/D"} (${data.conversion.convertedQuotes} convertidas / ${data.conversion.totalQuotes} evaluadas)`,
      `Cotizaciones abiertas: ${data.pendingQuotesCount}`,
      `Stock crítico: ${data.criticalStockCount}`,
      `Pagos por revisar: ${data.pendingPaymentsCount}`,
      `Clientes activos: ${data.activeCustomersCount}`,
    ].filter((line): line is string => Boolean(line)),
  });

  if (data.topProducts.length) {
    sections.push({
      heading: "Top productos por ventas",
      lines: data.topProducts.slice(0, 5).map((row, index) =>
        `${index + 1}. ${row.name} (${row.sku}) — ${row.units} uds — ${money(row.revenue, data.currency)}`,
      ),
    });
  }

  if (data.topCustomers.length) {
    sections.push({
      heading: "Top clientes",
      lines: data.topCustomers.slice(0, 5).map((row, index) =>
        `${index + 1}. ${row.name} — ${row.orders} ventas — ${money(row.revenue, data.currency)}`,
      ),
    });
  }

  if (data.topSellers.length) {
    sections.push({
      heading: "Vendedores",
      lines: data.topSellers.slice(0, 5).map((row, index) =>
        `${index + 1}. ${row.name} — ${money(row.revenue, data.currency)} — ${row.quotes} cotizaciones${row.conversion !== null ? ` — ${row.conversion.toFixed(1)}% conversión` : ""}`,
      ),
    });
  }

  const paymentTotal = data.paymentMethods.reduce((sum, row) => sum + row.amount, 0);
  if (paymentTotal > 0) {
    sections.push({
      heading: "Métodos de pago",
      lines: data.paymentMethods
        .filter((row) => row.amount > 0)
        .map((row) => `${row.method}: ${money(row.amount, data.currency)} (${((row.amount / paymentTotal) * 100).toFixed(1)}%)`),
    });
  }

  if (data.pipelineMacroSummary.some((row) => row.count > 0)) {
    sections.push({
      heading: "Pipeline comercial",
      lines: data.pipelineMacroSummary.map((row) =>
        `${row.macroStageLabel}: ${row.count} oportunidades — ${money(row.amount, data.currency)}`,
      ),
    });
  }

  return sections;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_LEFT = 50;
const MARGIN_TOP = 742;
const MARGIN_BOTTOM = 56;
const LINE_GAP = 16;

type PdfLine = { text: string; size: number; gapBefore?: number };

function escapePdfText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ")
    .slice(0, 110);
}

function paginate(flat: PdfLine[]): PdfLine[][] {
  const pages: PdfLine[][] = [];
  let current: PdfLine[] = [];
  let y = MARGIN_TOP;
  for (const line of flat) {
    const gap = current.length ? (line.gapBefore ?? LINE_GAP) : 0;
    if (current.length && y - gap < MARGIN_BOTTOM) {
      pages.push(current);
      current = [];
      y = MARGIN_TOP;
    } else {
      y -= gap;
    }
    current.push(line);
  }
  if (current.length) pages.push(current);
  return pages;
}

export function createDashboardSnapshotPdf(input: { title: string; subtitle: string; generatedAt: string; sections: ReportSection[] }) {
  const flat: PdfLine[] = [
    { text: input.title, size: 18 },
    { text: input.subtitle, size: 10, gapBefore: 16 },
    { text: `Generado: ${input.generatedAt}`, size: 9, gapBefore: 14 },
  ];
  for (const section of input.sections) {
    flat.push({ text: section.heading, size: 13, gapBefore: 24 });
    for (const line of section.lines) flat.push({ text: line, size: 10, gapBefore: 16 });
  }
  const pages = paginate(flat);
  const pageCount = Math.max(pages.length, 1);
  const pageObjNums = Array.from({ length: pageCount }, (_, i) => 3 + i);
  const fontObjNum = 3 + pageCount;
  const firstContentObjNum = fontObjNum + 1;

  const contentStreams = (pages.length ? pages : [flat.slice(0, 1)]).map((lines) => {
    const commands: string[] = ["BT"];
    lines.forEach((line, index) => {
      commands.push(`/F1 ${line.size} Tf`);
      commands.push(index === 0 ? `${MARGIN_LEFT} ${MARGIN_TOP} Td` : `0 -${line.gapBefore ?? LINE_GAP} Td`);
      commands.push(`(${escapePdfText(line.text)}) Tj`);
    });
    commands.push("ET");
    return commands.join("\n");
  });

  const objects: string[] = [];
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageCount} >>`;
  pageObjNums.forEach((num, i) => {
    objects[num - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${firstContentObjNum + i} 0 R >>`;
  });
  objects[fontObjNum - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  contentStreams.forEach((stream, i) => {
    objects[firstContentObjNum - 1 + i] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
