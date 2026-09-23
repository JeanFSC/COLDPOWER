"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function CmsError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="CMS no disponible" description="No pudimos cargar el contenido." />;
}
