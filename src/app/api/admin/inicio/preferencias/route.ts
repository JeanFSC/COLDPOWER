import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getWorkspacePreferences, saveWorkspacePreferences } from "@/lib/admin-workspace-service";

async function requireWorkspaceActor() {
  try {
    return await requireApiPermission("operations.view");
  } catch (error) {
    if (!(error instanceof ApiAuthorizationError)) throw error;
    return requireApiPermission("reports.view");
  }
}

export async function GET() {
  try {
    const actor = await requireWorkspaceActor();
    return apiSuccess({ preferences: await getWorkspacePreferences(actor.userId, actor.role) });
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError(
        "WORKSPACE_PREFERENCES_FORBIDDEN",
        "No tienes permiso para ver preferencias.",
        403,
      );
    return apiError(
      "WORKSPACE_PREFERENCES_UNAVAILABLE",
      "No se pudieron cargar las preferencias.",
      503,
    );
  }
}
export async function PATCH(request: Request) {
  try {
    const actor = await requireWorkspaceActor();
    const body = (await request.json()) as Record<string, unknown>;
    return apiSuccess({ preferences: await saveWorkspacePreferences(actor.userId, body) });
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError(
        "WORKSPACE_PREFERENCES_FORBIDDEN",
        "No tienes permiso para modificar preferencias.",
        403,
      );
    return apiError(
      "WORKSPACE_PREFERENCES_FAILED",
      error instanceof Error ? error.message : "No se pudieron guardar las preferencias.",
      400,
    );
  }
}
