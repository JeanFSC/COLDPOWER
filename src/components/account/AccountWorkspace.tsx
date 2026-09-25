"use client";

import { SignOutButton } from "@clerk/nextjs";
import {
  BadgeCheck,
  BarChart3,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  FileText,
  History,
  LogOut,
  Package,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { AccountOverview } from "@/lib/account-overview";

type NavigationData = {
  profile: AccountOverview["profile"];
  access: AccountOverview["access"];
  counts: AccountOverview["counts"];
  emailVerified: boolean;
  authEnabled: boolean;
};

type AccountWorkspaceProps = {
  children: ReactNode;
  navigation: NavigationData;
};

const breadcrumbLabels: Array<{ prefix: string; label: string }> = [
  { prefix: "/cuenta/pedidos", label: "Pedidos" },
  { prefix: "/cuenta/cotizaciones", label: "Cotizaciones" },
  { prefix: "/cuenta/pagos", label: "Pagos" },
  { prefix: "/cuenta/historial", label: "Volver a comprar" },
  { prefix: "/cuenta/datos", label: "Mis datos" },
  { prefix: "/cuenta/carrito", label: "Carrito" },
];

function initials(name: string | null, email: string | null) {
  const normalized = name?.trim();
  if (normalized) {
    const parts = normalized.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0]}` : parts[0][0]).toUpperCase();
  }
  return email?.trim()?.[0]?.toUpperCase() || "?";
}

function currentLabel(pathname: string) {
  if (pathname === "/cuenta" || pathname === "/cuenta/") return "Mi cuenta";
  return breadcrumbLabels.find((item) => pathname.startsWith(item.prefix))?.label || "Mi cuenta";
}

function isActive(pathname: string, href: string) {
  if (href === "/cuenta") return pathname === "/cuenta" || pathname === "/cuenta/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ href, label, icon: Icon, badge, pathname }: { href: string; label: string; icon: LucideIcon; badge?: string; pathname: string }) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`account-nav-item${active ? " is-active" : ""}`}
    >
      <Icon className="account-nav-icon" aria-hidden="true" />
      <span>{label}</span>
      {badge ? <span className="account-nav-badge">{badge}</span> : null}
    </Link>
  );
}

function AccountNavigation({ data, pathname }: { data: NavigationData; pathname: string }) {
  const name = data.profile.name?.trim() || "Cuenta ColdPower";
  const email = data.profile.email?.trim() || "Correo no registrado";
  const quoteBadge = data.counts.respondedQuotes > 0
    ? String(data.counts.respondedQuotes) + (data.counts.respondedQuotes === 1 ? " respondida" : " respondidas")
    : undefined;
  const paymentBadge = data.counts.pendingPayments > 0
    ? String(data.counts.pendingPayments) + (data.counts.pendingPayments === 1 ? " pendiente" : " pendientes")
    : undefined;

  return (
    <aside className="account-sidebar" aria-label="Navegación de mi cuenta">
      <div className="account-sidebar-profile">
        <div className="account-avatar" aria-hidden="true">{initials(data.profile.name, data.profile.email)}</div>
        <div className="account-sidebar-profile-copy">
          <p className="account-sidebar-name">{name}</p>
          <p className="account-sidebar-email" title={email}>{email}</p>
          {data.emailVerified ? (
            <span className="account-verified"><BadgeCheck aria-hidden="true" /> Cuenta verificada</span>
          ) : null}
        </div>
      </div>

      <nav className="account-nav" aria-label="Secciones de cuenta">
        <NavItem href="/cuenta" label="Resumen" icon={BarChart3} pathname={pathname} />
        <NavItem href="/cuenta/pedidos" label="Pedidos" icon={Package} badge={data.counts.orders ? String(data.counts.orders) : undefined} pathname={pathname} />
        <NavItem href="/cuenta/cotizaciones" label="Cotizaciones" icon={FileText} badge={quoteBadge} pathname={pathname} />
        <NavItem href="/cuenta/pagos" label="Pagos" icon={CreditCard} badge={paymentBadge} pathname={pathname} />
        <NavItem href="/cuenta/historial" label="Volver a comprar" icon={History} pathname={pathname} />
        <NavItem href="/cuenta/datos" label="Mis datos" icon={CircleUserRound} pathname={pathname} />
      </nav>

      <div className="account-sidebar-footer">
        {data.access.adminHref ? (
          <Link href={data.access.adminHref} className="account-sidebar-action">
            <ShieldCheck aria-hidden="true" />
            <span>Ir al panel administrativo</span>
          </Link>
        ) : null}
        {data.authEnabled ? (
          <SignOutButton redirectUrl="/">
            <button type="button" className="account-sidebar-action is-danger">
              <LogOut aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </SignOutButton>
        ) : (
          <Link href="/" className="account-sidebar-action is-danger">
            <LogOut aria-hidden="true" />
            <span>Cerrar sesión</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

export function AccountWorkspace({ children, navigation }: AccountWorkspaceProps) {
  const pathname = usePathname() || "/cuenta";
  const label = currentLabel(pathname);

  return (
    <div className="account-page">
      <div className="account-wide">
        <nav className="account-breadcrumb" aria-label="Migas de pan">
          <Link href="/">Inicio</Link>
          <ChevronRight aria-hidden="true" />
          <span>{label}</span>
        </nav>
        <div className="account-workspace-grid">
          <AccountNavigation data={navigation} pathname={pathname} />
          <div className="account-content" role="region" aria-label="Contenido de mi cuenta">{children}</div>
        </div>
      </div>
    </div>
  );
}

export type { NavigationData };
