import { tabularWorkbook } from "@/lib/tabular-workbook";
import { csvCell as csv } from "@/lib/csv";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { PipelineInvalidFilterError, parsePipelineFilters } from "@/lib/pipeline-contract";
import { getPipelinePage } from "@/lib/pipeline-repository";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("crm.export");
    const filters = parsePipelineFilters(new URL(request.url).searchParams);
    const first = await getPipelinePage({ ...filters, page: 1, pageSize: 100 });
    const rows = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) rows.push(...(await getPipelinePage({ ...filters, page, pageSize: 100 })).items);
    await writeAuditLog({ actorId: actor.userId, actorRole: actor.role, action: "crm.pipeline_exported", entityType: "opportunity", entityId: "pipeline-export", metadata: { filters, rowCount: rows.length } });
    const header = ["id", "codigo", "cliente", "telefono", "titulo", "origen", "etapa", "monto", "moneda", "proxima_accion", "seguimiento", "creado", "actualizado"];
    const values = rows.map((row) => [row.id, row.code, row.customerName, row.customerPhone, row.title, row.origin, row.stage, row.totalAmount, row.currency, row.nextAction, row.followUpAt, row.createdAt, row.updatedAt]);
    const filename = `pipeline-${new Date().toISOString().slice(0, 10)}`;
    if (new URL(request.url).searchParams.get("format") === "csv") {
      const body = values.map((row) => row.map(csv).join(","));
      return new Response(`\uFEFF${header.map(csv).join(",")}\n${body.join("\n")}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"`, "Cache-Control": "no-store" } });
    }
    return new Response(Buffer.from(tabularWorkbook("Pipeline", header, values.map((row) => row.map((value, index) => index === 7 && value != null ? Number(value) : value)))), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PIPELINE_EXPORT_FORBIDDEN", "No tienes permiso para exportar el pipeline.", 403);
    if (error instanceof PipelineInvalidFilterError) return apiError("PIPELINE_INVALID_FILTER", "Los filtros del pipeline no son válidos.", 400);
    return apiError("PIPELINE_EXPORT_FAILED", "No se pudo exportar el pipeline.", 503);
  }
}
