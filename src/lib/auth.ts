import { eq } from "drizzle-orm";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getDevAuthUserId } from "@/lib/dev-auth-bypass";
import { isAuthConfigured } from "@/lib/env";
import { can, isAppRole, isStaffRole, type AppRole, type Permission } from "@/lib/roles";

export type { AppRole };
export { isAppRole, isStaffRole };
// Kept as a compatibility export; authorization uses the persisted local record only.
export { roleFromClaims } from "@/lib/roles";

export class ApiAuthorizationError extends Error {
  constructor() {
    super("API_FORBIDDEN");
    this.name = "ApiAuthorizationError";
  }
}

type AccessRecord = { role: AppRole | null; status: "ACTIVE" | "INACTIVE" | "SUSPENDED" };

async function resolveAccess(userId: string): Promise<AccessRecord> {
  try {
    const [record] = await getDb().select({ role: users.role, roleCode: users.roleCode, status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
    // A Clerk claim alone is not enough to grant access: every account must
    // have a persisted, active local record before it can enter the app.
    if (!record) return { role: null, status: "INACTIVE" };
    if (record.status !== "ACTIVE") return { role: null, status: record.status };
    const role = record.roleCode ?? (record.role === "admin" ? "admin" : "customer");
    return { role, status: record.status };
  } catch (error) {
    console.error("ColdPower: no se pudo resolver el acceso persistido", error);
    return { role: null, status: "SUSPENDED" };
  }
}

export async function getCurrentUserRole(): Promise<AppRole | null> {
  if (!isAuthConfigured) return null;
  const { userId } = await auth();
  if (!userId) return null;
  const access = await resolveAccess(userId);
  return access.role;
}

async function getDevAdminUserId() {
  const requestHeaders = await headers();
  return getDevAuthUserId(requestHeaders.get("host"));
}

export async function requireUser() {
  if (!isAuthConfigured) redirect("/");
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const access = await resolveAccess(userId);
  if (!access.role || access.status !== "ACTIVE") redirect("/sign-in");
  return { userId, role: access.role };
}

export async function requireApiUser() {
  if (!isAuthConfigured) throw new ApiAuthorizationError();
  const { userId } = await auth();
  if (!userId) throw new ApiAuthorizationError();
  const access = await resolveAccess(userId);
  if (!access.role || access.status !== "ACTIVE") throw new ApiAuthorizationError();
  return { userId, role: access.role };
}

export async function requireAdmin() {
  const devUserId = await getDevAdminUserId();
  if (devUserId) {
    const access = await resolveAccess(devUserId);
    if (!access.role || !isStaffRole(access.role) || access.status !== "ACTIVE") redirect("/");
    return { userId: devUserId, role: access.role };
  }
  if (!isAuthConfigured) redirect("/");
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: "/admin" });
  const access = await resolveAccess(userId);
  if (!access.role || !isStaffRole(access.role) || access.status !== "ACTIVE") redirect("/");
  return { userId, role: access.role };
}

export async function requirePermission(permission: Permission) {
  const context = await requireAdmin();
  if (!can(context.role, permission)) redirect("/");
  return context;
}

export async function requireApiPermission(permission: Permission) {
  const devUserId = await getDevAdminUserId();
  if (devUserId) {
    const access = await resolveAccess(devUserId);
    if (!access.role || access.status !== "ACTIVE" || !can(access.role, permission)) throw new ApiAuthorizationError();
    return { userId: devUserId, role: access.role };
  }
  if (!isAuthConfigured) throw new ApiAuthorizationError();
  const { userId } = await auth();
  if (!userId) throw new ApiAuthorizationError();
  const [record] = await getDb().select({ role: users.role, roleCode: users.roleCode, status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
  const access: AccessRecord = record
    ? { role: record.roleCode ?? (record.role === "admin" ? "admin" : "customer"), status: record.status }
    : { role: null, status: "INACTIVE" };
  if (!access.role || access.status !== "ACTIVE" || !can(access.role, permission)) throw new ApiAuthorizationError();
  return { userId, role: access.role };
}

export async function setUserRole(userId: string, role: AppRole) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, { publicMetadata: { role } });
}



