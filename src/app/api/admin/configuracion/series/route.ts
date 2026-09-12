import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { createDocumentSeries, listDocumentSeries } from "@/lib/document-series";

export async function GET() {
  try {
    await requireApiPermission("company.settings.manage");
    const series = await listDocumentSeries();
    return NextResponse.json({ series });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("SERIES_FORBIDDEN", "No tienes permiso para ver las series.", 403);
    return apiError("SERIES_UNAVAILABLE", "No se pudieron cargar las series de documentos.", 503);
  }
}

export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("company.settings.manage"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("SERIES_FORBIDDEN", "No tienes permiso para crear series.", 403); throw error; }
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
  const value = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  if (!value) return apiError("SERIES_INVALID", "Datos de serie inválidos.", 400);
  try {
    const created = await createDocumentSeries({
      code: String(value.code ?? ""),
      label: String(value.label ?? ""),
      documentType: String(value.documentType ?? ""),
      prefix: String(value.prefix ?? ""),
      padding: typeof value.padding === "number" ? value.padding : undefined,
      actorId: actor.userId,
    });
    return NextResponse.json({ series: created }, { status: 201 });
  } catch (error) {
    return apiError("SERIES_INVALID", error instanceof Error ? error.message : "No se pudo crear la serie.", 400);
  }
}
