"use client";

import { useEffect, useState } from "react";
import type { PeriodKpi } from "@/lib/period-metrics";

export type ConfirmedNotification = {
  id: string;
  state: "READ" | "UNREAD" | "DISMISSED";
  readAt: Date | null;
  dismissedAt: Date | null;
};
type Confirmation = {
  notifications: ConfirmedNotification[];
  unreadCount?: number;
  personalUnread?: PeriodKpi;
  globalUnreadCount?: number;
};
const eventName = "coldpower:notification-confirmed";

// Only persisted API responses are published. No optimistic reading or count changes.
export function publishNotificationConfirmation(payload: Record<string, unknown>) {
  const rows = Array.isArray(payload.notifications) ? payload.notifications : [payload.notification];
  const notifications = rows.map((value): ConfirmedNotification => {
    if (!value || typeof value !== "object") throw new Error("Respuesta de notificación no válida.");
    const row = value as Record<string, unknown>;
    if (typeof row.id !== "string" || !["READ", "UNREAD", "DISMISSED"].includes(String(row.state))) {
      throw new Error("Respuesta de notificación no válida.");
    }
    const readAt = row.readAt ? new Date(String(row.readAt)) : null;
    const dismissedAt = row.dismissedAt ? new Date(String(row.dismissedAt)) : null;
    if ((readAt && Number.isNaN(readAt.getTime())) || (dismissedAt && Number.isNaN(dismissedAt.getTime()))) {
      throw new Error("Fecha de notificación no válida.");
    }
    return { id: row.id, state: row.state as ConfirmedNotification["state"], readAt, dismissedAt };
  });
  window.dispatchEvent(new CustomEvent<Confirmation>(eventName, { detail: {
    notifications,
    unreadCount: typeof payload.unreadCount === "number" ? payload.unreadCount : undefined,
    globalUnreadCount: typeof payload.globalUnreadCount === "number" ? payload.globalUnreadCount : undefined,
    personalUnread: payload.personalUnread as PeriodKpi | undefined,
  } }));
}

export function useConfirmedNotifications(source: unknown) {
  const [previousSource, setPreviousSource] = useState(source);
  const [confirmation, setConfirmation] = useState<Confirmation>({ notifications: [] });
  if (source !== previousSource) {
    setPreviousSource(source);
    setConfirmation({ notifications: [] });
  }
  useEffect(() => {
    const receive = (event: Event) => {
      const next = (event as CustomEvent<Confirmation>).detail;
      setConfirmation((previous) => ({ ...previous, ...next,
        unreadCount: next.unreadCount ?? previous.unreadCount,
        personalUnread: next.personalUnread ?? previous.personalUnread,
        globalUnreadCount: next.globalUnreadCount ?? previous.globalUnreadCount,
        notifications: [
        ...previous.notifications.filter((row) => !next.notifications.some((updated) => updated.id === row.id)),
        ...next.notifications,
      ] }));
    };
    window.addEventListener(eventName, receive);
    return () => window.removeEventListener(eventName, receive);
  }, []);
  return confirmation;
}
