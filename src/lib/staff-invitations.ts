import { isAppRole, type AppRole } from "@/lib/roles";

export type StaffInvitationInput = { email: unknown; role: unknown };
export type StaffInvitationData = { email: string; role: Exclude<AppRole, "admin" | "customer"> };

export function validateStaffInvitation(input: StaffInvitationInput): StaffInvitationData | null {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const role = input.role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (!isAppRole(role) || role === "admin" || role === "customer") return null;
  return { email, role };
}
