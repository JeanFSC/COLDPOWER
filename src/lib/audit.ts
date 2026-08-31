import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { sanitizeAuditValue } from "@/lib/operational-semantics";

export type AuditInput = {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  module?: string | null;
  severity?: "INFO" | "WARNING" | "CRITICAL" | string | null;
  origin?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export async function writeAuditLog(input: AuditInput) {
  const db = getDb();
  await db.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: input.actorId ?? null, actorRole: input.actorRole ?? null, action: input.action, entityType: input.entityType, entityId: input.entityId, module: input.module ?? input.action.split(".")[0] ?? null, severity: input.severity ?? "INFO", origin: input.origin ?? null, requestId: input.requestId ?? null, correlationId: input.correlationId ?? null, before: sanitizeAuditValue(input.before ?? null) as Record<string, unknown> | null, after: sanitizeAuditValue(input.after ?? null) as Record<string, unknown> | null, metadata: sanitizeAuditValue(input.metadata ?? null) as Record<string, unknown> | null });
}
