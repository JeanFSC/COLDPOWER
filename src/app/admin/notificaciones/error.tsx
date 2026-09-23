"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function NotificationsError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Notificaciones no disponibles" description="No pudimos cargar las notificaciones." />;
}
