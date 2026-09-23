"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function PurchasesError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Compras no disponibles" description="No pudimos cargar las compras." />;
}
