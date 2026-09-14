import { headers } from "next/headers";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { sanitizeAuditValue } from "@/lib/operational-semantics";

// Best-effort request context capture. Reads the current request's headers via
// Next's AsyncLocalStorage-backed headers() — works from any server codepath
// invoked during a request (route handler, server action, or a service they
// call), without threading the request through every one of writeAuditLog's
// ~50 call sites. Returns nulls outside a request (webhooks, background jobs,
// tests) instead of throwing — this is enrichment, never a write blocker.
async function captureRequestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;
    return { ip, userAgent: requestHeaders.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

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
  const providedMetadata = (sanitizeAuditValue(input.metadata ?? null) as Record<string, unknown> | null) ?? {};
  const hasIp = typeof providedMetadata.ip === "string";
  const hasUserAgent = typeof providedMetadata.userAgent === "string";
  const context = hasIp && hasUserAgent ? { ip: null, userAgent: null } : await captureRequestContext();
  const metadata = { ...providedMetadata, ip: hasIp ? providedMetadata.ip : context.ip, userAgent: hasUserAgent ? providedMetadata.userAgent : context.userAgent };
  await db.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: input.actorId ?? null, actorRole: input.actorRole ?? null, action: input.action, entityType: input.entityType, entityId: input.entityId, module: input.module ?? input.action.split(".")[0] ?? null, severity: input.severity ?? "INFO", origin: input.origin ?? null, requestId: input.requestId ?? null, correlationId: input.correlationId ?? null, before: sanitizeAuditValue(input.before ?? null) as Record<string, unknown> | null, after: sanitizeAuditValue(input.after ?? null) as Record<string, unknown> | null, metadata: Object.values(metadata).some((value) => value !== null && value !== undefined) ? metadata : null });
}
