import { revalidateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditLogs, companySettings, companySettingsHistory } from "@/db/schema";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { publicCompanySettings } from "@/lib/company-settings";
import { validateCompanySettingsInput } from "@/lib/company-settings-validation";

export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try {
    actor = await requireApiPermission("settings.business.edit");
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("COMPANY_SETTINGS_FORBIDDEN", "No tienes permiso para restaurar configuración.", 403);
    throw error;
  }
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
  const value = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const version = Number(value.version);
  const expectedVersion = Number(value.expectedVersion);
  if (!Number.isInteger(version) || version < 1 || !Number.isInteger(expectedVersion) || expectedVersion < 0) return apiError("COMPANY_SETTINGS_INVALID", "version y expectedVersion son obligatorios.", 400);
  try {
    const saved = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('coldpower:company-settings'))`);
      const [current] = await tx.select().from(companySettings).where(eq(companySettings.id, "default")).limit(1);
      const [history] = await tx.select().from(companySettingsHistory).where(and(eq(companySettingsHistory.settingsId, "default"), eq(companySettingsHistory.version, version))).limit(1);
      if (!history) throw new Error("La versión solicitada no existe.");
      if ((current?.version ?? 0) !== expectedVersion) throw new Error("COMPANY_SETTINGS_CONFLICT");
      const candidate = validateCompanySettingsInput(history.after);
      const nextVersion = (current?.version ?? 0) + 1;
      const [after] = current
        ? await tx.update(companySettings).set({ ...candidate, version: nextVersion, validationStatus: "VALID", updatedBy: actor.userId, updatedAt: new Date() }).where(eq(companySettings.id, "default")).returning()
        : await tx.insert(companySettings).values({ id: "default", ...candidate, version: nextVersion, validationStatus: "VALID", updatedBy: actor.userId, updatedAt: new Date() }).returning();
      if (!after) throw new Error("No se pudo guardar la configuración restaurada.");
      await tx.insert(companySettingsHistory).values({ id: `settings-history-${crypto.randomUUID()}`, settingsId: "default", version: nextVersion, actorId: actor.userId, actorRole: actor.role, before: current ? publicCompanySettings(current) as Record<string, unknown> : null, after: publicCompanySettings(after) as Record<string, unknown>, validationStatus: "VALID" });
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "company.settings_restored", entityType: "company_settings", entityId: "default", before: current ? { version: current.version } : null, after: { version: after.version, restoredVersion: version }, metadata: null });
      return after;
    });
    revalidateTag("coldpower-company-settings", "max");
    return NextResponse.json({ settings: publicCompanySettings(saved), version: saved.version, restoredVersion: version });
  } catch (error) {
    if (error instanceof Error && error.message === "COMPANY_SETTINGS_CONFLICT") return apiError("COMPANY_SETTINGS_CONFLICT", "La configuración cambió mientras restaurabas.", 409);
    return apiError("COMPANY_SETTINGS_RESTORE_FAILED", error instanceof Error ? error.message : "No se pudo restaurar la configuración.", 400);
  }
}
