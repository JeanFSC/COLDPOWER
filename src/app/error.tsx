"use client";

import { useEffect } from "react";
import { Button } from "@/components/shared/Button";

export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error("ColdPower public route error", error); }, [error]);
  return <section className="bg-surface-page px-4 py-20"><div className="mx-auto max-w-xl rounded-lg border border-danger/25 bg-white p-8 text-center shadow-card"><p className="font-mono text-xs font-extrabold uppercase tracking-[0.16em] text-danger">Error de contenido</p><h1 className="mt-3 font-display text-3xl font-black text-dark">No pudimos cargar esta página</h1><p className="mt-3 text-sm leading-6 text-gray-text">Intenta nuevamente. Si el problema continúa, solicita ayuda técnica.</p><div className="mt-6 flex justify-center gap-3"><Button type="button" onClick={unstable_retry} variant="primary">Reintentar</Button><Button href="/contacto" variant="outline">Ir a contacto</Button></div></div></section>;
}

