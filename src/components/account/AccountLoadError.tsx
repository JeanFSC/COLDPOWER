import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";

export function AccountLoadError({
  title = "No pudimos cargar tu cuenta",
  description = "Hubo un problema temporal al consultar tus datos. Intenta nuevamente.",
  href = "/cuenta",
}: {
  title?: string;
  description?: string;
  href?: string;
}) {
  return (
    <section className="account-route-error" role="alert" aria-live="polite">
      <span className="account-route-error-icon"><CircleAlert aria-hidden="true" /></span>
      <div>
        <p className="account-eyebrow">Cuenta temporalmente no disponible</p>
        <h1>{title}</h1>
        <p className="account-route-error-description">{description}</p>
        <Link href={href} className="account-route-error-action">Reintentar <ArrowRight aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
