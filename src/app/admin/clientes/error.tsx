"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function CustomersError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Clientes no disponible" description="No pudimos cargar los clientes." />;
}
