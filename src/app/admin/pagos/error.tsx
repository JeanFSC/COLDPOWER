"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function PaymentsError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Pagos no disponible" description="No pudimos cargar los pagos." />;
}
