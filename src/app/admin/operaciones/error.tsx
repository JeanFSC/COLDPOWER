"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function OperationsError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Operaciones no disponibles" description="No pudimos cargar las operaciones." />;
}
