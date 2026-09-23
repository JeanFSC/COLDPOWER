"use client";

import { AdminSegmentError } from "@/components/admin/AdminSegmentError";

export default function SettingsError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <AdminSegmentError {...props} title="Configuración no disponible" description="No pudimos cargar la configuración." />;
}
