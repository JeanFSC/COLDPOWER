export const REPORT_RUN_LEASE_MS = 15 * 60_000;

export function reportRunLeaseExpired(run: { startedAt: Date | null; createdAt: Date }, now: Date) {
  const startedAt = run.startedAt ?? run.createdAt;
  return Number.isFinite(now.getTime()) && Number.isFinite(startedAt.getTime()) &&
    now.getTime() - startedAt.getTime() >= REPORT_RUN_LEASE_MS;
}
