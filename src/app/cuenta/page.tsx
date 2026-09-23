import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Headphones,
  Mail,
  MapPin,
  PackageOpen,
  Phone,
  ReceiptText,
  Settings2,
  ShoppingCart,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  emptyAccountOverview,
  getAccountOverview,
  type AccountActivity,
  type AccountOverview,
} from "@/lib/account-overview";
import { AccountProfileEditor } from "@/components/account/AccountProfileEditor";

export const metadata: Metadata = {
  title: "Mi cuenta | ColdPower",
  description: "Gestiona tus datos, cotizaciones, pedidos y pagos de ColdPower.",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Lima",
});

const monthYearFormatter = new Intl.DateTimeFormat("es-PE", {
  month: "long",
  year: "numeric",
  timeZone: "America/Lima",
});

const activityTone: Record<AccountActivity["kind"], { icon: string; iconText: string; status: string }> = {
  quote: { icon: "bg-[#eaf5fc]", iconText: "text-primary", status: "bg-[#eaf5fc] text-primary" },
  order: { icon: "bg-[#fff1e6]", iconText: "text-[#b85f12]", status: "bg-[#fff1e6] text-[#9a4c09]" },
  payment: { icon: "bg-[#eaf9f0]", iconText: "text-[#1a8a4b]", status: "bg-[#eaf9f0] text-[#14743e]" },
};

function initials(name: string | null, email: string | null) {
  const value = name?.trim();
  if (value) {
    const parts = value.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0]}` : parts[0][0]).toUpperCase();
  }
  return email?.trim()?.[0]?.toUpperCase() || "?";
}

function formatSince(value: Date | null) {
  return value ? monthYearFormatter.format(value) : null;
}

function formatActivityDate(value: Date) {
  return dateFormatter.format(value).replace(" de ", " ");
}

function ActivityGlyph({ kind }: { kind: AccountActivity["kind"] }) {
  if (kind === "quote") return <FileText className="h-5 w-5" aria-hidden="true" />;
  if (kind === "order") return <PackageOpen className="h-5 w-5" aria-hidden="true" />;
  return <CreditCard className="h-5 w-5" aria-hidden="true" />;
}

function profileValue(value: string | null | undefined) {
  return value?.trim() || "No registrada";
}

function ProfileInfo({ icon: Icon, label, value, secondary, editable = false }: { icon: LucideIcon; label: string; value: string | null | undefined; secondary?: string | null; editable?: boolean }) {
  const hasValue = Boolean(value?.trim());
  return (
    <div className="rounded-2xl border border-[#e3edf4] bg-[#fbfdff] p-4">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-gray-text">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {label}
      </div>
      <p className={`mt-2 break-words text-sm font-bold ${hasValue ? "text-dark" : "text-gray-text"}`}>
        {profileValue(value)}
      </p>
      {secondary ? <p className="mt-1 text-xs text-gray-text">{secondary}</p> : null}
      {!hasValue && editable ? <span className="mt-1 inline-flex text-xs font-extrabold text-primary">Agregar</span> : null}
    </div>
  );
}

function ActivityItem({ activity }: { activity: AccountActivity }) {
  const tone = activityTone[activity.kind];
  return (
    <li>
      <Link href={activity.href} className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-surface-page focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon} ${tone.iconText}`}>
          <ActivityGlyph kind={activity.kind} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-extrabold text-dark">{activity.label}</span>
            <span className="text-xs font-bold text-gray-text">{activity.reference}</span>
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-text">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <time dateTime={activity.occurredAt.toISOString()}>{formatActivityDate(activity.occurredAt)}</time>
          </span>
        </span>
        <span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-extrabold sm:inline-flex ${tone.status}`}>{activity.status}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-text transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
      </Link>
    </li>
  );
}

function AccessCard({
  href,
  title,
  description,
  meta,
  icon: Icon,
  className,
  iconClassName,
}: {
  href: string;
  title: string;
  description: string;
  meta: string;
  icon: LucideIcon;
  className: string;
  iconClassName: string;
}) {
  return (
    <Link href={href} className={`group flex min-h-[190px] flex-col rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${className}`}>
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClassName}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="mt-5 flex items-center justify-between gap-3">
        <span className="font-display text-xl font-black text-dark">{title}</span>
        <ArrowRight className="h-5 w-5 shrink-0 text-dark transition group-hover:translate-x-1" aria-hidden="true" />
      </span>
      <span className="mt-2 text-sm leading-6 text-gray-text">{description}</span>
      <span className="mt-auto pt-4 text-xs font-extrabold uppercase tracking-[0.1em] text-gray-text">{meta}</span>
    </Link>
  );
}

export default async function CuentaPage() {
  const { userId, role } = await requireUser();
  let overview: AccountOverview = emptyAccountOverview(role);
  let dataWarning = false;

  try {
    overview = await getAccountOverview(userId, role);
  } catch (error) {
    dataWarning = true;
    console.error("ColdPower: no se pudo cargar el resumen de cuenta", error);
  }

  const { profile } = overview;
  const since = formatSince(profile.customerSince);
  const greeting = profile.firstName ? `Hola, ${profile.firstName}` : "Hola";
  const adminHref = overview.access.adminHref;

  return (
    <div className="bg-white text-dark">
      <section className="relative isolate overflow-hidden bg-[#edf8ff]">
        <Image
          src="/images/account-hero-coldpower.webp"
          alt="Unidad condensadora y caja ColdPower sobre un fondo de hielo geométrico"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_center] lg:object-[58%_center]"
        />
        <div className="absolute inset-0 -z-0 bg-gradient-to-r from-[#edf8ff]/98 via-[#edf8ff]/80 to-[#edf8ff]/20 lg:from-[#edf8ff]/98 lg:via-[#edf8ff]/64 lg:to-transparent" />
        <div className="relative z-10 cp-container">
          <nav className="flex items-center gap-2 py-5 text-xs font-bold text-gray-text" aria-label="Migas de pan">
            <Link href="/" className="transition hover:text-primary">Inicio</Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-dark">Mi cuenta</span>
          </nav>
          <div className="relative flex min-h-[480px] items-center py-14 sm:min-h-[520px] lg:min-h-[540px] lg:py-20">
            <div className="max-w-xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Espacio privado ColdPower</p>
              <h1 className="mt-4 max-w-lg font-display text-5xl font-black leading-[0.92] tracking-[-0.04em] text-dark sm:text-7xl">MI CUENTA</h1>
              <p className="mt-7 font-display text-2xl font-black text-dark sm:text-3xl">{greeting} <span aria-hidden="true">👋</span></p>
              <p className="mt-3 max-w-md text-base leading-7 text-gray-text sm:text-lg">Aquí puedes gestionar tus datos, revisar tus cotizaciones y seguir cada pedido de refrigeración.</p>
              {since ? (
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-primary">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Cliente desde {since}
                </p>
              ) : null}
            </div>
            <p className="absolute right-0 top-14 hidden max-w-[250px] rotate-[-8deg] text-right font-[cursive] text-3xl font-bold italic leading-tight text-primary/80 xl:block">Tu proyecto,<br />nuestro respaldo</p>
          </div>
        </div>
      </section>

      <section id="perfil" className="cp-container relative z-10 -mt-10 pb-8 sm:-mt-14 sm:pb-12">
        <article className="rounded-[2rem] border border-[#dbe8f0] bg-white p-5 shadow-card sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4 sm:gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#dff1fb] font-display text-xl font-black text-primary sm:h-20 sm:w-20 sm:text-2xl" aria-hidden="true">
                {initials(profile.name, profile.email)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-black text-dark sm:text-3xl">{profileValue(profile.name)}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf9f0] px-2.5 py-1 text-xs font-extrabold text-[#14743e]">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {profile.customerId ? "Cliente" : "Cuenta activa"}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-sm text-gray-text sm:grid-cols-2 sm:gap-x-5">
                  <span className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{profileValue(profile.email)}</span></span>
                  <span className="flex min-w-0 items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{profileValue(profile.phone)}</span></span>
                </div>
                {dataWarning ? <p className="mt-3 text-sm font-semibold text-[#9a4c09]">No pudimos cargar todos tus datos. Las acciones se mantienen disponibles.</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <AccountProfileEditor profile={profile} />
              {adminHref ? <Link href={adminHref} className="inline-flex h-10 items-center justify-center rounded-pill border border-border px-4 text-sm font-extrabold text-gray-text transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Ir al panel administrativo</Link> : null}
            </div>
          </div>
          {!profile.customerId ? (
            <p className="mt-6 rounded-2xl border border-[#f4d59d] bg-[#fff8e8] px-4 py-3 text-sm leading-6 text-[#805b13]">Tu cuenta está activa, pero todavía no encontramos un perfil comercial asociado. Puedes seguir usando las acciones disponibles y actualizar tus datos básicos.</p>
          ) : null}
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ProfileInfo icon={Building2} label="Empresa" value={profile.companyName} editable={Boolean(profile.customerId)} />
            <ProfileInfo icon={MapPin} label="Dirección" value={profile.primaryAddress?.address} secondary={profile.primaryAddress?.location} editable={Boolean(profile.customerId)} />
            <ProfileInfo icon={Phone} label="Teléfono" value={profile.phone} editable />
            <ProfileInfo icon={Mail} label="Correo" value={profile.email} />
          </div>
        </article>
      </section>

      <section className="cp-container pb-12 sm:pb-16" aria-labelledby="account-access-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Accesos rápidos</p>
            <h2 id="account-access-title" className="mt-2 font-display text-3xl font-black tracking-[-0.03em] text-dark">Todo lo que necesitas, en un solo lugar</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-gray-text">Consulta tus operaciones reales y retoma el siguiente paso cuando quieras.</p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AccessCard href="/cuenta/cotizaciones" title="Mis cotizaciones" description="Consulta el estado de tus solicitudes y conversaciones comerciales." meta={overview.counts.quotes ? `${overview.counts.quotes} registrada${overview.counts.quotes === 1 ? "" : "s"}` : "Ver solicitudes"} icon={FileText} className="bg-[#eaf5fc]" iconClassName="bg-[#cbe7f7] text-primary" />
          <AccessCard href="/cuenta/pedidos" title="Mis pedidos" description="Sigue el estado, entrega y avance de tus compras confirmadas." meta={overview.counts.orders ? `${overview.counts.orders} pedido${overview.counts.orders === 1 ? "" : "s"}` : "Ver pedidos"} icon={PackageOpen} className="bg-[#fff1e6]" iconClassName="bg-[#ffe0c7] text-[#b85f12]" />
          <AccessCard href="/cuenta/carrito" title="Carrito de cotización" description="Retoma los productos que guardaste para solicitar una cotización." meta={overview.counts.quoteCartItems ? `${overview.counts.quoteCartItems} producto${overview.counts.quoteCartItems === 1 ? "" : "s"}` : "Carrito vacío"} icon={ShoppingCart} className="bg-[#f0edff]" iconClassName="bg-[#ded8ff] text-[#6354c7]" />
          <AccessCard href="/cuenta/pagos" title="Mis pagos" description="Revisa estados y referencias de los pagos asociados a tus pedidos." meta={overview.counts.payments ? `${overview.counts.payments} registro${overview.counts.payments === 1 ? "" : "s"}` : "Ver pagos"} icon={WalletCards} className="bg-[#eaf9f0]" iconClassName="bg-[#d2f1df] text-[#18834a]" />
        </div>
      </section>

      <section className="cp-container grid gap-5 pb-12 lg:grid-cols-[1.55fr_0.9fr] sm:pb-16" aria-label="Actividad y ayuda">
        <article className="rounded-[2rem] border border-[#dbe8f0] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="account-activity-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Seguimiento</p>
              <h2 id="account-activity-title" className="mt-2 font-display text-2xl font-black text-dark">Actividad reciente</h2>
              <p className="mt-1 text-sm text-gray-text">Los últimos movimientos visibles de tu cuenta.</p>
            </div>
            {overview.counts.quotes ? <Link href="/cuenta/cotizaciones" className="inline-flex items-center gap-1 text-sm font-extrabold text-primary hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Ver cotizaciones <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link> : null}
          </div>
          {overview.recentActivity.length ? (
            <ul className="mt-5 divide-y divide-[#edf1f4]">
              {overview.recentActivity.map((activity) => <ActivityItem key={activity.id} activity={activity} />)}
            </ul>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-page px-5 py-7 text-center">
              <ReceiptText className="mx-auto h-8 w-8 text-gray-text" aria-hidden="true" />
              <p className="mt-3 font-extrabold text-dark">Aún no hay actividad para mostrar</p>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-text">Cuando envíes una cotización o tengas un pedido, sus cambios aparecerán aquí.</p>
              <Link href="/catalogo" className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Explorar catálogo <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          )}
        </article>

        <aside className="rounded-[2rem] bg-[#f4f8fb] p-5 sm:p-7" aria-labelledby="account-help-title">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Estamos para ayudarte</p>
          <h2 id="account-help-title" className="mt-2 font-display text-2xl font-black text-dark">¿Necesitas ayuda?</h2>
          <div className="mt-5 grid gap-3">
            <Link href="/contacto" className="group flex items-center gap-3 rounded-2xl bg-white p-4 transition hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf5fc] text-primary"><Headphones className="h-5 w-5" aria-hidden="true" /></span>
              <span className="flex-1"><span className="block text-sm font-extrabold text-dark">Contactar soporte</span><span className="mt-1 block text-xs text-gray-text">Te ayudamos con tu cuenta.</span></span>
              <ChevronRight className="h-4 w-4 text-gray-text transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
            </Link>
            <Link href="/faq" className="group flex items-center gap-3 rounded-2xl bg-white p-4 transition hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1e6] text-[#b85f12]"><BookOpen className="h-5 w-5" aria-hidden="true" /></span>
              <span className="flex-1"><span className="block text-sm font-extrabold text-dark">Preguntas frecuentes</span><span className="mt-1 block text-xs text-gray-text">Respuestas rápidas.</span></span>
              <ChevronRight className="h-4 w-4 text-gray-text transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
            </Link>
            <Link href="#perfil" className="group flex items-center gap-3 rounded-2xl bg-white p-4 transition hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0edff] text-[#6354c7]"><Settings2 className="h-5 w-5" aria-hidden="true" /></span>
              <span className="flex-1"><span className="block text-sm font-extrabold text-dark">Configurar mi cuenta</span><span className="mt-1 block text-xs text-gray-text">Edita tus datos desde tu perfil.</span></span>
              <ChevronRight className="h-4 w-4 text-gray-text transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </section>

      <section className="relative isolate overflow-hidden bg-[#eaf6fd]" aria-labelledby="account-cta-title">
        <Image src="/images/account-hero-coldpower.webp" alt="" fill sizes="100vw" className="z-0 object-cover object-right opacity-20" aria-hidden="true" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#eaf6fd] via-[#eaf6fd]/95 to-[#eaf6fd]/50" />
        <div className="relative z-10 cp-container flex flex-col gap-5 py-14 sm:flex-row sm:items-center sm:justify-between sm:py-20">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Siguiente paso</p>
            <h2 id="account-cta-title" className="mt-2 max-w-xl font-display text-3xl font-black tracking-[-0.03em] text-dark sm:text-4xl">¿Buscas un producto específico?</h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-gray-text">Envíanos los datos de tu equipo y te ayudamos a encontrar el repuesto correcto.</p>
          </div>
          <Link href="/cotizacion" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-pill bg-primary px-6 text-sm font-extrabold text-white shadow-card transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Solicitar una cotización <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
