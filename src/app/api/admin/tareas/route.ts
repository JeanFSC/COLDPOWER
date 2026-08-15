import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { createTask, CrmDomainError, updateTaskStatus } from "@/lib/crm-service";
import { taskStatuses, type TaskStatus } from "@/lib/crm-validation";

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("crm.manage");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    if (typeof input.title !== "string" || !input.title.trim()) return apiError("TASK_INVALID", "Título obligatorio.", 400);
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? (typeof input.idempotencyKey === "string" ? input.idempotencyKey : null);
    const result = await createTask({ customerId: typeof input.customerId === "string" ? input.customerId : null, opportunityId: typeof input.opportunityId === "string" ? input.opportunityId : null, quoteId: typeof input.quoteId === "string" ? input.quoteId : null, title: input.title.trim().slice(0, 180), description: typeof input.description === "string" ? input.description.trim().slice(0, 2000) : null, assignedTo: typeof input.assignedTo === "string" ? input.assignedTo.trim().slice(0, 120) : null, dueAt: input.dueAt ? new Date(String(input.dueAt)) : null, idempotencyKey: idempotencyKey?.trim().slice(0, 180) || null }, actor);
    return apiSuccess({ task: result.task, idempotent: result.idempotent }, result.idempotent ? 200 : 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CRM_FORBIDDEN", "No tienes permiso para crear tareas.", 403);
    if (error instanceof CrmDomainError) return apiError(error.code, error.message, error.status);
    return apiError("TASK_NOT_SAVED", error instanceof Error ? error.message : "No se pudo crear la tarea.", 400);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireApiPermission("crm.manage");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    if (typeof input.id !== "string" || typeof input.status !== "string" || !(taskStatuses as readonly string[]).includes(input.status)) return apiError("TASK_INVALID", "id y estado son obligatorios.", 400);
    return apiSuccess({ task: await updateTaskStatus(input.id, input.status as TaskStatus, actor) });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CRM_FORBIDDEN", "No tienes permiso para actualizar tareas.", 403);
    if (error instanceof CrmDomainError) return apiError(error.code, error.message, error.status);
    return apiError("TASK_NOT_UPDATED", error instanceof Error ? error.message : "No se pudo actualizar la tarea.", 409);
  }
}
