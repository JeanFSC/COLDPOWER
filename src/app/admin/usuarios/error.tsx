"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function UsersError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Usuarios no disponibles" description="No pudimos cargar los usuarios." />;
}
