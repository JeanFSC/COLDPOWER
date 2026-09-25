"use client";

import { useEffect } from "react";
import { ArrowRight, CircleAlert } from "lucide-react";
import { Button } from "@/components/shared/Button";

export default function CuentaError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error("ColdPower: error de la ruta de cuenta", {
      errorName: error?.name || "UnknownError",
      digest: error?.digest,
    });
  }, [error]);

  return (
    <main className="account-page">
      <div className="account-wide">
        <section className="account-route-error" role="alert" aria-live="polite">
          <span className="account-route-error-icon"><CircleAlert aria-hidden="true" /></span>
          <div>
            <p className="account-eyebrow">Cuenta temporalmente no disponible</p>
            <h1>No pudimos cargar tu cuenta</h1>
            <p className="account-route-error-description">Hubo un problema temporal al consultar tus datos. Intenta nuevamente.</p>
            <Button type="button" onClick={unstable_retry} className="account-route-error-action">Reintentar <ArrowRight aria-hidden="true" /></Button>
          </div>
        </section>
      </div>
    </main>
  );
}
