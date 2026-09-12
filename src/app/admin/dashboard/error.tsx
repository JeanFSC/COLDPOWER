"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function DashboardError(props: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <AdminSegmentError
      {...props}
      title="Dashboard no disponible"
      description="No pudimos cargar las métricas del dashboard."
    />
  );
}
