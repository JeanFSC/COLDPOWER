import { sanitizeAuditValue } from "@/lib/operational-semantics";

export function auditExportSnapshot(value: unknown, canViewSensitive: boolean): string {
  if (!canViewSensitive) return "[REDACTED]";
  const sanitized = sanitizeAuditValue(value);
  if (sanitized === null || sanitized === undefined) return "";
  return typeof sanitized === "string" ? sanitized : JSON.stringify(sanitized);
}
