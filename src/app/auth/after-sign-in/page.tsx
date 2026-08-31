import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isAuthConfigured } from "@/lib/env";
import type { AppRole } from "@/lib/roles";

/** Clerk's post-auth landing page, based only on the persisted local role. */
export default async function AfterSignInPage() {
  if (!isAuthConfigured) redirect("/");
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await getDb().select({ role: users.role, roleCode: users.roleCode, status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.status !== "ACTIVE") redirect("/sign-in?error=access_pending");

  const role = (user.roleCode ?? (user.role === "admin" ? "admin" : "customer")) as AppRole;
  if (role === "SUPERADMIN" || role === "GERENCIA" || role === "JEFATURA") redirect("/admin/dashboard");
  if (role === "REPORTES") redirect("/admin/reportes");
  if (role !== "customer") redirect("/admin/operaciones");
  redirect("/cuenta");
}
