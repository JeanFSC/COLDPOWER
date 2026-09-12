import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { getQuoteDetail } from "@/lib/quote-repository";
import { createQuoteSnapshotPdf } from "@/lib/quote-pdf";
import { writeAuditLog } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("quotes.view");
    const { id } = await params;
    const detail = await getQuoteDetail(id);
    if (!detail) return apiError("QUOTE_NOT_FOUND", "Cotización no encontrada.", 404);
    const version = detail.versions.find((item) => item.id === detail.quote.acceptedVersionId) ?? detail.versions[0];
    if (!version) return apiError("QUOTE_VERSION_REQUIRED", "La cotización todavía no tiene una versión enviada.", 409);
    const bytes = createQuoteSnapshotPdf({ trackingCode: detail.quote.trackingCode, customerName: detail.customer?.name ?? detail.quote.name, customerDocument: detail.customer?.documentNumber ?? detail.quote.documentNumber, message: detail.quote.message, currency: version.currency, subtotal: version.subtotal, discountAmount: version.discountAmount, taxAmount: version.taxAmount, total: version.total, validUntil: version.validUntil, versionNumber: version.versionNumber, items: version.items.map((item) => ({ sku: item.skuSnapshot, name: item.productNameSnapshot, quantity: item.quantity, unitPrice: item.finalUnitPrice, lineTotal: item.lineTotal })) });
    await writeAuditLog({ actorId: actor.userId, actorRole: actor.role, action: "quotes.pdf_generated", entityType: "quote", entityId: id, metadata: { versionId: version.id, versionNumber: version.versionNumber, snapshot: true } });
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${detail.quote.trackingCode}-v${version.versionNumber}.pdf"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTES_FORBIDDEN", "No tienes permiso para descargar cotizaciones.", 403);
    return apiError("QUOTE_PDF_FAILED", error instanceof Error ? error.message : "No se pudo generar el PDF.", 503);
  }
}
