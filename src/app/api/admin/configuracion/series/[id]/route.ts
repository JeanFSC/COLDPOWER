import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { setDocumentSeriesActive } from "@/lib/document-series";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("settings.business.edit"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("SERIES_FORBIDDEN", "No tienes permiso para modificar series.", 403); throw error; }
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
  const value = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  if (!value || typeof value.active !== "boolean") return apiError("SERIES_INVALID", "active es obligatorio.", 400);
  try {
    const updated = await setDocumentSeriesActive(id, value.active, actor.userId, actor.role);
    return NextResponse.json({ series: updated });
  } catch (error) {
    return apiError("SERIES_INVALID", error instanceof Error ? error.message : "No se pudo actualizar la serie.", 400);
  }
}
