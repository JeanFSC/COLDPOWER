import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { Button } from "@/components/shared/Button";
import { ProfileForm } from "@/components/account/ProfileForm";
import { isStaffRole, type AppRole } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Mi cuenta | ColdPower",
  description: "Perfil, cotizaciones, carrito y pedidos de ColdPower.",
};

const accountSections = [
  {
    href: "/cuenta/cotizaciones",
    title: "Mis cotizaciones",
    description: "Consulta estados y actualizaciones comerciales.",
  },
  {
    href: "/cuenta/carrito",
    title: "Carrito de cotizacion",
    description: "Revisa las referencias guardadas para solicitar precio.",
  },
  {
    href: "/cuenta/pedidos",
    title: "Mis pedidos",
    description: "Sigue oportunidades aprobadas y convertidas.",
  },
  {
    href: "/cuenta/pagos",
    title: "Mis pagos",
    description: "Consulta el estado de tus pagos y referencias.",
  },
];

function getAdminEntry(role: AppRole) {
  if (!isStaffRole(role)) return null;
  if (role === "SUPERADMIN" || role === "GERENCIA" || role === "JEFATURA") {
    return {
      href: "/admin/dashboard",
      title: "Panel administrativo",
      description: "Gestiona el negocio, el catálogo y la operación desde el dashboard.",
      cta: "Abrir dashboard",
    };
  }
  if (role === "REPORTES") {
    return {
      href: "/admin/reportes",
      title: "Panel de reportes",
      description: "Consulta los indicadores y reportes disponibles para tu rol.",
      cta: "Abrir reportes",
    };
  }
  return {
    href: "/admin/operaciones",
    title: "Panel operativo",
    description: "Accede a tus cotizaciones, pedidos, clientes e inventario.",
    cta: "Abrir operaciones",
  };
}

export default async function CuentaPage() {
  const { userId, role } = await requireUser();
  const adminEntry = getAdminEntry(role);
  let profile: { email: string; name: string | null; phone: string | null } | null = null;

  try {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    profile = rows[0] ?? null;
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el perfil", error);
  }

  return (
    <section className="bg-background py-14 sm:py-18">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Mi cuenta</p>
        <h1 className="mt-3 font-display text-3xl font-black text-dark">
          {profile?.name || "Hola"}
        </h1>
        {adminEntry ? (
          <div className="mt-6 flex flex-col items-start justify-between gap-5 rounded-md bg-dark p-5 text-white shadow-card sm:flex-row sm:items-center sm:p-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
                Acceso administrativo
              </p>
              <h2 className="mt-2 font-display text-2xl font-black">{adminEntry.title}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
                {adminEntry.description}
              </p>
            </div>
            <Button href={adminEntry.href} variant="primary" size="sm" className="shrink-0">
              {adminEntry.cta}
            </Button>
          </div>
        ) : null}
        <div className="mt-8 rounded-md border border-border bg-white p-6">
          {profile ? (
            <>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-extrabold uppercase tracking-[0.1em] text-gray-text">
                    Correo
                  </dt>
                  <dd className="mt-1 text-sm text-dark">{profile.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-extrabold uppercase tracking-[0.1em] text-gray-text">
                    Telefono
                  </dt>
                  <dd className="mt-1 text-sm text-dark">{profile.phone || "No registrado"}</dd>
                </div>
              </dl>
              <ProfileForm initialName={profile.name || ""} initialPhone={profile.phone || ""} />
            </>
          ) : (
            <p className="text-sm text-gray-text">
              Todavia no encontramos tu perfil. Intenta recargar en unos segundos.
            </p>
          )}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {accountSections.map((section) => (
            <article key={section.href + section.title} className="rounded-md border border-border bg-white p-5">
              <h2 className="font-display text-xl font-black text-dark">{section.title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-gray-text">
                {section.description}
              </p>
              <Button href={section.href} variant="outline" size="sm" className="mt-4">
                Abrir
              </Button>
            </article>
          ))}
        </div>
        <section className="mt-4 rounded-md border border-border bg-white p-5" aria-labelledby="history-title">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Seguimiento posterior</p>
              <h2 id="history-title" className="mt-1 font-display text-xl font-black text-dark">Historial y recompra</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-text">
                Un solo espacio para revisar lo comprado, consultar el historial y volver a solicitar una referencia.
              </p>
            </div>
            <span className="inline-flex h-8 items-center rounded-full bg-surface-page px-3 text-xs font-bold text-gray-text">
              3 accesos relacionados
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Button href="/cuenta/historial" variant="outline" size="sm" className="justify-center">
              Historial
            </Button>
            <Button href="/cuenta/historial" variant="outline" size="sm" className="justify-center">
              Productos comprados
            </Button>
            <Button href="/cuenta/historial" variant="outline" size="sm" className="justify-center">
              Repetir pedido
            </Button>
          </div>
        </section>
        <div className="mt-8 rounded-md border border-teal/25 bg-teal/10 p-5">
          <p className="font-extrabold text-dark">Alertas</p>
          <p className="mt-1 text-sm leading-6 text-gray-text">
            Las actualizaciones importantes se reflejan en el estado de cada cotizacion. No hay
            alertas nuevas.
          </p>
        </div>
      </div>
    </section>
  );
}
