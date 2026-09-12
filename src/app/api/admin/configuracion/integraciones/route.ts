import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { listIntegrations } from "@/lib/integrations";

export async function GET() {
  try {
    await requireApiPermission("company.settings.manage");
    const integrations = await listIntegrations();
    return NextResponse.json({ integrations });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("INTEGRATIONS_FORBIDDEN", "No tienes permiso para ver integraciones.", 403);
    return apiError("INTEGRATIONS_UNAVAILABLE", "No se pudo cargar el estado de integraciones.", 503);
  }
}
