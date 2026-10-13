import { tabularWorkbook } from "@/lib/tabular-workbook";
import { csvCell as csv } from "@/lib/csv";
import { ApiAuthorizationError } from "@/lib/auth";
import { parseTaxonomyFilters, getTaxonomyPage } from "@/lib/taxonomy-admin";
import { requireTaxonomyAccess } from "@/lib/taxonomy-access";
import { apiError } from "@/lib/api-errors";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const filters = parseTaxonomyFilters(params);
    await requireTaxonomyAccess(filters.entity);
    const first = await getTaxonomyPage({ ...filters, page: 1, pageSize: 100 });
    const rows = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) {
      rows.push(...(await getTaxonomyPage({ ...filters, page, pageSize: 100 })).items);
    }
    const header = ["ID", "Nombre", "Slug", "Activo", "Categoría", "Productos", "Publicados", "Creado", "Actualizado"];
    const values = rows.map((row) => [row.id, row.name, row.slug, row.active, row.categoryName, row.productCount, row.publishedProductCount, row.createdAt.toISOString(), row.updatedAt.toISOString()]);
    if (params.get("format") === "csv") {
      const lines = [header, ...values].map((row) => row.map(csv).join(","));
      return new Response(`\ufeff${lines.join("\r\n")}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=coldpower-${filters.entity}.csv`, "cache-control": "no-store" } });
    }
    return new Response(Buffer.from(tabularWorkbook("Taxonomía", header, values)), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename=coldpower-${filters.entity}.xlsx`, "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("TAXONOMY_EXPORT_FORBIDDEN", "No tienes permiso para exportar esta taxonomía.", 403);
    return apiError("TAXONOMY_EXPORT_FAILED", "No se pudo exportar la taxonomía.", 503);
  }
}
