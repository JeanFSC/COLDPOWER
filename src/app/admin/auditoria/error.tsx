"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function AuditError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Auditoría no disponible" description="No pudimos cargar la auditoría." />;
}
