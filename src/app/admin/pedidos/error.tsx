"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function OrdersError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Pedidos no disponible" description="No pudimos cargar los pedidos." />;
}
