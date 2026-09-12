import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { getNotificationsPage, parseNotificationFilters } from "@/lib/notifications-service";
import {
  getNotificationAutomationMetrics,
  listNotificationRules,
  listNotificationSchedules,
  listNotificationTemplates,
  processDueNotificationSchedules,
} from "@/lib/notification-rules-service";
import { NotificationsList } from "@/components/admin/NotificationsList";
import { NotificationAdminControls } from "@/components/admin/NotificationAdminControls";
import { Tanda2Notifications } from "@/components/admin/AdminTanda2Workspaces";
import { can } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Notificaciones | Panel admin ColdPower",
  description: "Centro interno de notificaciones.",
};
type Params = Record<string, string | string[] | undefined>;
function toQuery(params: Params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  return query;
}
export default async function AdminNotificacionesPage({
  searchParams,
}: {
  searchParams?: Promise<Params>;
}) {
  const actor = await requirePermission("notifications.view");
  const query = toQuery((await searchParams) ?? {});
  let page = {
    items: [],
    page: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 1,
    unreadCount: 0,
    metrics: { unread: 0, read: 0, dismissed: 0 },
  } as Awaited<ReturnType<typeof getNotificationsPage>>;
  let automation: Awaited<ReturnType<typeof getNotificationAutomationMetrics>> | null = null;
  let controlData: {
    templates: Awaited<ReturnType<typeof listNotificationTemplates>>;
    rules: Awaited<ReturnType<typeof listNotificationRules>>;
    schedules: Awaited<ReturnType<typeof listNotificationSchedules>>;
  } | null = null;
  let loadError: string | null = null;
  try {
    try {
      await processDueNotificationSchedules();
    } catch (error) {
      console.error("ColdPower: no se pudieron procesar avisos programados", error);
    }
    [page, automation] = await Promise.all([
      getNotificationsPage(actor.userId, parseNotificationFilters(query)),
      getNotificationAutomationMetrics(),
    ]);
    if (can(actor.role, "notifications.manage")) {
      const [templates, rules, schedules] = await Promise.all([
        listNotificationTemplates(),
        listNotificationRules(),
        listNotificationSchedules(),
      ]);
      controlData = { templates, rules, schedules };
    }
  } catch (error) {
    console.error("ColdPower: no se pudieron cargar notificaciones", error);
    loadError = "No pudimos cargar las notificaciones.";
  }
  return (
    <Tanda2Notifications
      unreadCount={page.unreadCount}
      metrics={page.metrics}
      automation={automation}
      templatesCount={controlData?.templates.length}
      controls={
        controlData ? (
          <NotificationAdminControls
            templates={controlData.templates}
            rules={controlData.rules}
            schedules={controlData.schedules}
          />
        ) : null
      }
    >
      <NotificationsList
        notifications={page.items}
        metrics={page.metrics}
        unreadCount={page.unreadCount}
        pagination={{ page: page.page, totalPages: page.totalPages, totalItems: page.totalItems }}
        queryString={query.toString()}
        loadError={loadError}
      />
    </Tanda2Notifications>
  );
}
