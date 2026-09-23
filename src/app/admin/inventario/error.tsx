"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function InventoryError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <AdminSegmentError
      error={error}
      unstable_retry={unstable_retry}
      title="Inventario no disponible"
      description="No pudimos cargar los saldos persistidos. La información se mantiene protegida; vuelve a intentarlo cuando PostgreSQL esté disponible."
    />
  );
}
