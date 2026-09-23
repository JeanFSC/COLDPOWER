import { revalidateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditLogs, companySettings, companySettingsHistory } from "@/db/schema";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { administrativeCompanySettings, companySettingsFields, publicCompanySettings, toCompanySettingsAdminResponse } from "@/lib/company-settings";
import { validateCompanySettingsInput } from "@/lib/company-settings-validation";

const SETTINGS_ID = "default";
class CompanySettingsConflictError extends Error { constructor() { super("COMPANY_SETTINGS_CONFLICT"); this.name = "CompanySettingsConflictError"; } }

function adminResponse(settings: typeof companySettings.$inferSelect | null) {
  if (!settings) return { settings: null, public: {}, administrative: {}, version: 0, updatedAt: null, updatedBy: null, validationStatus: "NOT_CONFIGURED" };
  const response = toCompanySettingsAdminResponse(settings);
  return { settings: response.public, ...response };
}
function plainObject(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function expectedVersion(value: Record<string, unknown>) { const parsed = Number(value.version); if (!Number.isInteger(parsed) || parsed < 0) throw new Error("version es obligatorio para controlar concurrencia."); return parsed; }
function partialSettings(body: Record<string, unknown>, before: typeof companySettings.$inferSelect | null) { const previous = before ? Object.fromEntries(companySettingsFields.map((field) => [field, before[field]])) : Object.fromEntries(companySettingsFields.map((field) => [field, null])); return Object.fromEntries(companySettingsFields.map((field) => [field, Object.prototype.hasOwnProperty.call(body, field) ? body[field] : previous[field]])); }
function invalidatePublicSettings() { revalidateTag("coldpower-company-settings", "max"); }

export async function GET() {
  try { await requireApiPermission("company.settings.manage"); const [settings] = await getDb().select().from(companySettings).where(eq(companySettings.id, SETTINGS_ID)).limit(1); return NextResponse.json(adminResponse(settings ?? null)); }
  catch (error) { if (error instanceof ApiAuthorizationError) return apiError("COMPANY_SETTINGS_FORBIDDEN", "No tienes permiso para ver configuración.", 403); return apiError("COMPANY_SETTINGS_UNAVAILABLE", "No se pudo cargar la configuración empresarial.", 503); }
}

export async function PUT(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("company.settings.manage"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("COMPANY_SETTINGS_FORBIDDEN", "No tienes permiso para modificar configuración.", 403); throw error; }
  let body: unknown; try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
  const value = plainObject(body); if (!value) return apiError("COMPANY_SETTINGS_INVALID", "Configuración empresarial inválida.", 400);
  try {
    const expected = expectedVersion(value);
    const saved = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('coldpower:company-settings'))`);
      const [before] = await tx.select().from(companySettings).where(eq(companySettings.id, SETTINGS_ID)).limit(1);
      if ((before?.version ?? 0) !== expected) throw new CompanySettingsConflictError();
      const input = validateCompanySettingsInput(partialSettings(value, before));
      const nextVersion = (before?.version ?? 0) + 1;
      const [after] = before ? await tx.update(companySettings).set({ ...input, version: nextVersion, validationStatus: "VALID", updatedBy: actor.userId, updatedAt: new Date() }).where(and(eq(companySettings.id, SETTINGS_ID), eq(companySettings.version, expected))).returning() : await tx.insert(companySettings).values({ id: SETTINGS_ID, ...input, version: nextVersion, validationStatus: "VALID", updatedBy: actor.userId, updatedAt: new Date() }).returning();
      if (!after) throw new CompanySettingsConflictError();
      await tx.insert(companySettingsHistory).values({ id: `settings-history-${crypto.randomUUID()}`, settingsId: SETTINGS_ID, version: nextVersion, actorId: actor.userId, actorRole: actor.role, before: before ? publicCompanySettings(before) as Record<string, unknown> : null, after: publicCompanySettings(after) as Record<string, unknown>, validationStatus: "VALID" });
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "company.settings_updated", entityType: "company_settings", entityId: SETTINGS_ID, before: before ? { version: before.version, settings: publicCompanySettings(before) } : null, after: { version: after.version, settings: publicCompanySettings(after) }, metadata: { validationStatus: "VALID" } });
      return after;
    });
    invalidatePublicSettings();
    const response = adminResponse(saved);
    return NextResponse.json({ ...response, settings: response.public });
  } catch (error) {
    if (error instanceof CompanySettingsConflictError) return apiError("COMPANY_SETTINGS_CONFLICT", "La configuración cambió mientras la editabas. Recarga antes de guardar.", 409);
    return apiError("COMPANY_SETTINGS_INVALID", error instanceof Error ? error.message : "No se pudo guardar la configuración empresarial.", 400);
  }
}
