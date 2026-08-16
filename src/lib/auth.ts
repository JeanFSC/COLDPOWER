import { eq } from "drizzle-orm";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isAuthConfigured } from "@/lib/env";
import { can, isAppRole, isStaffRole, type AppRole, type Permission } from "@/lib/roles";
import { getDevAuthBypassUserId } from "@/lib/dev-auth-bypass";

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

async function getRequestHost() {
  try {
    const requestHeaders = await headers();
    return requestHeaders.get("x-forwarded-host")?.split(",", 1)[0]?.trim() || requestHeaders.get("host")?.trim() || null;
  } catch {
    return null;
  }
}

async function getRequestUserId() {
  const devUserId = getDevAuthBypassUserId(await getRequestHost());
  if (devUserId) return devUserId;
  if (!isAuthConfigured) return null;
  return (await auth()).userId;
}

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
  const userId = await getRequestUserId();
  if (!userId) return null;
  const access = await resolveAccess(userId);
  return access.role;
}

export async function requireUser() {
  const userId = await getRequestUserId();
  if (!isAuthConfigured && !getDevAuthBypassUserId(await getRequestHost())) redirect("/");
  if (!userId) redirect("/sign-in");
  const access = await resolveAccess(userId);
  if (!access.role || access.status !== "ACTIVE") redirect("/sign-in");
  return { userId, role: access.role };
}

export async function requireApiUser() {
  const userId = await getRequestUserId();
  if (!userId) throw new ApiAuthorizationError();
  const access = await resolveAccess(userId);
  if (!access.role || access.status !== "ACTIVE") throw new ApiAuthorizationError();
  return { userId, role: access.role };
}

export async function requireAdmin() {
  const devUserId = getDevAuthBypassUserId(await getRequestHost());
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
  const userId = await getRequestUserId();
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



