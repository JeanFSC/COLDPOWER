type PdfLine = { sku: string; name: string; quantity: number; unitPrice: string | null; lineTotal: string | null };

function escapePdf(value: string) { return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)").replaceAll("\r", " ").replaceAll("\n", " ").slice(0, 180); }

export function createQuoteSnapshotPdf(input: { trackingCode: string; customerName: string; customerDocument?: string | null; message?: string | null; currency: string | null; subtotal: string | null; discountAmount: string | null; taxAmount: string | null; taxMode?: string | null; total: string | null; validUntil: Date | string | null; versionNumber: number; items: PdfLine[] }) {
  const money = (value: string | null) => value ? `${input.currency ?? ""} ${value}` : "Por cotizar";
  const taxConfigured = input.taxMode === "INCLUDED" || input.taxMode === "EXCLUDED";
  const rows = [
    "ColdPower · Propuesta comercial",
    `${input.trackingCode} · Versión ${input.versionNumber}`,
    `Cliente: ${input.customerName}${input.customerDocument ? ` · ${input.customerDocument}` : ""}`,
    `Vigencia: ${input.validUntil ? new Date(input.validUntil).toLocaleDateString("es-PE") : "Por definir"}`,
    "",
    ...input.items.flatMap((item) => [`${item.sku} · ${item.name}`, `Cantidad ${item.quantity} · Unitario ${money(item.unitPrice)} · Total ${money(item.lineTotal)}`]),
    "",
    `Subtotal: ${money(input.subtotal)}`,
    `Descuento: ${money(input.discountAmount)}`,
    taxConfigured ? `Op. gravada: ${money(input.subtotal)}` : "Op. gravada: Por configurar",
    taxConfigured ? `IGV: ${money(input.taxAmount)}` : "IGV 18%: Por configurar",
    `Total: ${taxConfigured ? money(input.total) : "Por configurar"}`,
    "",
    input.message ? `Nota: ${input.message}` : "Precios tomados del snapshot de la versión enviada.",
  ];
  const commands = ["BT", "/F1 18 Tf", "50 770 Td"];
  rows.forEach((row, index) => { if (index) commands.push("0 -22 Td", "/F1 10 Tf"); commands.push(`(${escapePdf(row)}) Tj`); });
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
