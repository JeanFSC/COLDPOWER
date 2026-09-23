import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { Tanda2Home } from "@/components/admin/AdminTanda2Workspaces";
import { getUnreadNotificationCount } from "@/lib/notifications-service";
import { requireAdmin } from "@/lib/auth";
import { getHomeActivitySummary } from "@/lib/operations-dashboard";
import { getOperationsWorkspace } from "@/lib/operations-workspace";
import { can, permissionsForRole } from "@/lib/roles";
import { getWorkspacePreferences, listRecentAdminItems } from "@/lib/admin-workspace-service";

export const metadata: Metadata = {
  title: "Inicio | Panel admin ColdPower",
  description: "Espacio de trabajo personal de ColdPower.",
};

export default async function AdminHomePage() {
  const actor = await requireAdmin();
  const [profileResult, unreadResult, dashboardResult, workspaceResult, preferencesResult, recentResult] = await Promise.allSettled([
    getDb().select({ name: users.name, email: users.email }).from(users).where(eq(users.id, actor.userId)).limit(1),
    getUnreadNotificationCount(actor.userId),
    can(actor.role, "dashboard.view") ? getHomeActivitySummary({ range: "today" }, actor) : Promise.resolve(null),
    can(actor.role, "operations.view") ? getOperationsWorkspace({ range: "today", sellerId: actor.userId, page: 1, pageSize: 10 }, { allowedPermissions: permissionsForRole(actor.role), summaryScope: "home" }) : Promise.resolve(null),
    getWorkspacePreferences(actor.userId, actor.role),
    listRecentAdminItems(actor.userId),
  ]);

  const actorName = profileResult.status === "fulfilled" ? profileResult.value[0]?.name ?? profileResult.value[0]?.email ?? null : null;
  const unreadCount = unreadResult.status === "fulfilled" ? unreadResult.value : 0;
  const data = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
  const snapshot = workspaceResult.status === "fulfilled" ? workspaceResult.value : null;
  const preferences = preferencesResult.status === "fulfilled" ? preferencesResult.value : null;
  const recentItems = recentResult.status === "fulfilled" ? recentResult.value : [];

  return <Tanda2Home data={data} snapshot={snapshot} actorName={actorName} role={actor.role} unreadCount={unreadCount} preferences={preferences} recentItems={recentItems} />;
}
