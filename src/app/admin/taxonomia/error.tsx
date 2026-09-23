"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function TaxonomyError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Taxonomía no disponible" description="No pudimos cargar la taxonomía." />;
}
