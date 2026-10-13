import type { CompanySettings } from "@/lib/company-settings";
import { can, type AppRole } from "@/lib/roles";

export class CompanySettingsRestorePermissionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "CompanySettingsRestorePermissionError";
  }
}

export function assertCompanySettingsRestorePermissions(role: AppRole, current: CompanySettings | null | undefined, candidate: CompanySettings) {
  if ((current?.legalPagesPublished === true) !== (candidate.legalPagesPublished === true) && !can(role, "settings.legal.publish")) {
    throw new CompanySettingsRestorePermissionError("COMPANY_SETTINGS_LEGAL_PUBLISH_FORBIDDEN", "No tienes permiso para restaurar un cambio de publicación legal.");
  }
  const taxMode = (value: CompanySettings["taxMode"]) => value === "UNCONFIGURED" ? null : value ?? null;
  const taxRate = (value: CompanySettings["taxRate"]) => value == null || value === "" ? null : Number(value);
  const taxChanged = taxRate(current?.taxRate) !== taxRate(candidate.taxRate) || taxMode(current?.taxMode) !== taxMode(candidate.taxMode);
  if (taxChanged && role !== "SUPERADMIN") {
    throw new CompanySettingsRestorePermissionError("COMPANY_SETTINGS_TAX_FORBIDDEN", "Solo SUPERADMIN puede restaurar cambios en la configuración del IGV.");
  }
}
