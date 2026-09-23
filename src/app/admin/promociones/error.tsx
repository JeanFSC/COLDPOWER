"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function PromotionsError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Promociones no disponibles" description="No pudimos cargar las promociones." />;
}
