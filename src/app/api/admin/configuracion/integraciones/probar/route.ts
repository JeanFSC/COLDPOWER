import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { testAllIntegrations } from "@/lib/integrations";

export async function POST() {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("company.settings.manage"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("INTEGRATIONS_FORBIDDEN", "No tienes permiso para probar integraciones.", 403); throw error; }
  try {
    const integrations = await testAllIntegrations(actor.userId);
    return NextResponse.json({ integrations });
  } catch (error) {
    return apiError("INTEGRATIONS_TEST_FAILED", error instanceof Error ? error.message : "No se pudo probar las integraciones.", 500);
  }
}
