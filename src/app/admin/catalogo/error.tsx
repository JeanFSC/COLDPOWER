"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function CatalogError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Catálogo no disponible" description="No pudimos cargar el catálogo." />;
}
