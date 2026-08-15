import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { parsePricingFilters } from "@/lib/pricing-contract";
import { getPricingPage } from "@/lib/pricing-repository";
import { toPricingCsv } from "@/lib/pricing-export";
import { can } from "@/lib/roles";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("pricing.view");
    const filters = parsePricingFilters(new URL(request.url).searchParams);
    const includeCost = can(actor.role, "pricing.cost.view");
    if (filters.priceType === "COST" && !includeCost) return apiError("PRICING_FORBIDDEN", "No tienes permiso para exportar costos.", 403);
    const data = await getPricingPage(filters, { includeCost });
    await getDb().insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "pricing.exported", entityType: "pricing", entityId: "pricing", before: null, after: { filters, rows: data.items.length }, metadata: { format: "csv" } });
    return new NextResponse(toPricingCsv(data, includeCost), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=coldpower-precios.csv" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PRICING_FORBIDDEN", "No tienes permiso para exportar precios.", 403);
    if (error instanceof Error && error.message === "PRICING_INVALID_FILTER") return apiError("PRICING_INVALID_FILTER", "Los filtros de exportación no son válidos.", 400);
    return apiError("PRICING_UNAVAILABLE", "No se pudo exportar precios.", 503);
  }
}
