import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { testIntegration } from "@/lib/integrations";

export async function POST(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("integrations.manage"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("INTEGRATIONS_FORBIDDEN", "No tienes permiso para probar integraciones.", 403); throw error; }
  try {
    const integration = await testIntegration(key, actor.userId);
    return NextResponse.json({ integration });
  } catch (error) {
    return apiError("INTEGRATIONS_TEST_FAILED", error instanceof Error ? error.message : "No se pudo probar la integración.", 400);
  }
}
