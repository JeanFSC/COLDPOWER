"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function SalesError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Ventas no disponible" description="No pudimos cargar las ventas." />;
}
