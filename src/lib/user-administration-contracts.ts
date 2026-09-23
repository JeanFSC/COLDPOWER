import { allOperationalRoles, roleLabel, type AppRole, type OperationalRole } from "@/lib/roles";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export const staffRoleCatalog: Array<{ value: OperationalRole; label: string }> = allOperationalRoles.map((value) => ({
  value: value as OperationalRole,
  label: roleLabel(value as AppRole),
}));

export const userRoleCatalog: Array<{ value: AppRole; label: string }> = [
  { value: "customer", label: roleLabel("customer") },
  ...staffRoleCatalog,
  { value: "admin", label: roleLabel("admin") },
];
