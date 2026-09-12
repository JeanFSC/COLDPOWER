import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminRecentItems, adminWorkspacePreferences } from "@/db/operations-schema";
import type { AppRole } from "@/lib/roles";

export type WorkspacePreferences = {
  favorites: string[];
  quickActions: string[];
  widgetOrder: string[];
  collapsedWidgets: string[];
};
export type RecentAdminItem = { entityType: string; entityId: string; label: string; href: string };
export const defaultWorkspaceWidgets = [
  "attention",
  "frequent",
  "quick-actions",
  "agenda",
] as const;
export const defaultWorkspaceQuickActions = [
  "quotes.create",
  "customers.create",
  "inventory.adjust",
  "purchases.manage",
  "reports.view",
] as const;
const defaultWidgets = [...defaultWorkspaceWidgets];
const validHref = /^\/admin(?:[/?#]|$)/;
function cleanList(value: unknown, max: number) {
  return Array.isArray(value)
    ? [
        ...new Set(
          value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ].slice(0, max)
    : [];
}
function defaultsForRole(role: AppRole): WorkspacePreferences {
  return {
    favorites:
      role === "REPORTES"
        ? ["/admin/reportes", "/admin/auditoria"]
        : ["/admin/operaciones", "/admin/cotizaciones", "/admin/inventario"],
    quickActions: [...defaultWorkspaceQuickActions],
    widgetOrder: defaultWidgets,
    collapsedWidgets: [],
  };
}

export async function getWorkspacePreferences(userId: string, role: AppRole) {
  const [row] = await getDb()
    .select()
    .from(adminWorkspacePreferences)
    .where(eq(adminWorkspacePreferences.userId, userId))
    .limit(1);
  return row
    ? {
        favorites: row.favorites,
        quickActions: row.quickActions,
        widgetOrder: row.widgetOrder,
        collapsedWidgets: row.collapsedWidgets,
        updatedAt: row.updatedAt,
      }
    : { ...defaultsForRole(role), updatedAt: null };
}

export async function saveWorkspacePreferences(
  userId: string,
  input: Partial<WorkspacePreferences>,
) {
  const current = await getDb()
    .select()
    .from(adminWorkspacePreferences)
    .where(eq(adminWorkspacePreferences.userId, userId))
    .limit(1);
  const fallback = {
    favorites: [],
    quickActions: [...defaultWorkspaceQuickActions],
    widgetOrder: defaultWidgets,
    collapsedWidgets: [],
  };
  const next = {
    favorites: cleanList(input.favorites ?? current[0]?.favorites ?? fallback.favorites, 20).filter(
      (href) => validHref.test(href),
    ),
    quickActions: cleanList(
      input.quickActions ?? current[0]?.quickActions ?? fallback.quickActions,
      20,
    ).filter((id) =>
      defaultWorkspaceQuickActions.includes(id as (typeof defaultWorkspaceQuickActions)[number]),
    ),
    widgetOrder: cleanList(
      input.widgetOrder ?? current[0]?.widgetOrder ?? fallback.widgetOrder,
      20,
    ).filter((id) =>
      defaultWorkspaceWidgets.includes(id as (typeof defaultWorkspaceWidgets)[number]),
    ),
    collapsedWidgets: cleanList(
      input.collapsedWidgets ?? current[0]?.collapsedWidgets ?? fallback.collapsedWidgets,
      20,
    ),
  };
  if (!next.quickActions.length) next.quickActions = [...defaultWorkspaceQuickActions];
  next.widgetOrder = [
    ...next.widgetOrder,
    ...defaultWorkspaceWidgets.filter((id) => !next.widgetOrder.includes(id)),
  ];
  const [row] = current.length
    ? await getDb()
        .update(adminWorkspacePreferences)
        .set({ ...next, updatedAt: new Date() })
        .where(eq(adminWorkspacePreferences.userId, userId))
        .returning()
    : await getDb()
        .insert(adminWorkspacePreferences)
        .values({ userId, ...next })
        .returning();
  return row;
}

export async function listRecentAdminItems(userId: string) {
  return getDb()
    .select({
      id: adminRecentItems.id,
      entityType: adminRecentItems.entityType,
      entityId: adminRecentItems.entityId,
      label: adminRecentItems.label,
      href: adminRecentItems.href,
      visitedAt: adminRecentItems.visitedAt,
    })
    .from(adminRecentItems)
    .where(eq(adminRecentItems.userId, userId))
    .orderBy(desc(adminRecentItems.visitedAt))
    .limit(10);
}

export async function recordRecentAdminItem(userId: string, input: RecentAdminItem) {
  if (!validHref.test(input.href)) throw new Error("La ruta reciente no es válida.");
  const db = getDb();
  const now = new Date();
  await db
    .insert(adminRecentItems)
    .values({
      id: `admin-recent-${crypto.randomUUID()}`,
      userId,
      entityType: input.entityType.trim().slice(0, 80),
      entityId: input.entityId.trim().slice(0, 180),
      label: input.label.trim().slice(0, 180),
      href: input.href.trim().slice(0, 500),
      visitedAt: now,
    })
    .onConflictDoUpdate({
      target: [adminRecentItems.userId, adminRecentItems.entityType, adminRecentItems.entityId],
      set: {
        label: input.label.trim().slice(0, 180),
        href: input.href.trim().slice(0, 500),
        visitedAt: now,
      },
    });
  const rows = await db
    .select({ id: adminRecentItems.id })
    .from(adminRecentItems)
    .where(eq(adminRecentItems.userId, userId))
    .orderBy(desc(adminRecentItems.visitedAt))
    .offset(10);
  if (rows.length)
    await db.delete(adminRecentItems).where(
      and(
        eq(adminRecentItems.userId, userId),
        sql`${adminRecentItems.id} in (${sql.join(
          rows.map((row) => sql`${row.id}`),
          sql`, `,
        )})`,
      ),
    );
  return listRecentAdminItems(userId);
}
