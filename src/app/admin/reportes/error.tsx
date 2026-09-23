"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function ReportsError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Reportes no disponibles" description="No pudimos cargar los reportes." />;
}
