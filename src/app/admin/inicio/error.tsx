"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function AdminHomeError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Inicio no disponible" description="No pudimos cargar el inicio administrativo." />;
}
