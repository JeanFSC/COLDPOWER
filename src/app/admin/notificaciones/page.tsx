import type { Metadata } from "next";
import { NotificationsModule } from "@/components/admin/AdminNotificationsModule";
import { NotificationsList } from "@/components/admin/NotificationsList";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import {
  getNotificationsPage,
  getNotificationPreferences,
  getPersonalUnreadKpi,
  listNotificationTypes,
  parseNotificationFilters,
} from "@/lib/notifications-service";
import {
  getNotificationAutomationMetrics,
  getNotificationDetail,
  listNotificationRules,
  listNotificationSchedules,
  listNotificationTemplates,
} from "@/lib/notification-rules-service";

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

export default async function AdminNotificacionesPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const actor = await requirePermission("notifications.view");
  const canManage = can(actor.role, "notifications.manage");
  const canPreferences = can(actor.role, "notifications.preferences");
  const query = toQuery((await searchParams) ?? {});
  const requestedNotificationId = query.get("notificationId") ?? undefined;
  const inboxQuery = new URLSearchParams(query);
  inboxQuery.delete("notificationId");

  let loadError = false;
  let page: Awaited<ReturnType<typeof getNotificationsPage>> = {
    items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 1,
    unreadCount: 0, metrics: { unread: 0, read: 0, dismissed: 0 },
  };
  let automation: Awaited<ReturnType<typeof getNotificationAutomationMetrics>> | null = null;
  let types: string[] = [];
  let rules: Awaited<ReturnType<typeof listNotificationRules>> = [];
  let templates: Awaited<ReturnType<typeof listNotificationTemplates>> = [];
  let schedules: Awaited<ReturnType<typeof listNotificationSchedules>> = [];
  let personalUnread: Awaited<ReturnType<typeof getPersonalUnreadKpi>> = { current: 0, previous: 0, deltaPct: null };
  let preferences: Record<string, boolean> = {};

  try {
    [page, automation, types, rules, templates, schedules, personalUnread, preferences] = await Promise.all([
      getNotificationsPage(actor.userId!, parseNotificationFilters(inboxQuery)),
      getNotificationAutomationMetrics(),
      listNotificationTypes(actor.userId!),
      listNotificationRules(),
      listNotificationTemplates(),
      listNotificationSchedules(),
      getPersonalUnreadKpi(actor.userId!),
      canPreferences ? getNotificationPreferences(actor.userId!) : Promise.resolve({}),
    ]);
  } catch (error) {
    console.error("ColdPower: no se pudieron cargar notificaciones", error);
    loadError = true;
  }

  const selectedNotificationId = requestedNotificationId ?? page.items.find((item) => item.state === "UNREAD")?.id ?? page.items[0]?.id;
  const detail = selectedNotificationId
    ? await getNotificationDetail(selectedNotificationId, canManage ? undefined : actor.userId!).catch(() => null)
    : null;

  return (
    <NotificationsModule
      loadError={loadError}
      canManage={canManage}
      canPreferences={canPreferences}
      preferences={preferences}
      personalUnread={personalUnread}
      automation={automation ?? {
        critical: 0,
        activeRules: { current: 0, previous: 0, deltaPct: null },
        scheduled: { current: 0, previous: 0, deltaPct: null },
        remindersToday: { current: 0, previous: 0, deltaPct: null },
        failed: { current: 0, previous: 0, deltaPct: null },
        slaAlerts: { current: 0, previous: 0, deltaPct: null },
        delivery: { entregadas: 0, enCola: 0, fallidas: 0, pendientes: 0, noLeidas: 0 },
      }}
      inboxSlot={
        <NotificationsList
          notifications={page.items}
          pagination={{ page: page.page, totalPages: page.totalPages, totalItems: page.totalItems }}
          queryString={inboxQuery.toString()}
          types={types}
          selectedId={selectedNotificationId}
          loadError={loadError ? "No pudimos cargar las notificaciones." : null}
        />
      }
      detail={detail}
      rules={rules}
      templates={templates}
      schedules={schedules}
    />
  );
}
