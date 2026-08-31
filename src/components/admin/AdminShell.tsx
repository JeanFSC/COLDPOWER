"use client";

import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileText,
  Image,
  LayoutDashboard,
  Menu,
  Package,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Tag,
  UsersRound,
  Warehouse,
  Workflow,
  X,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { roleLabel, type AppRole } from "@/lib/roles";

export type AdminNavIcon =
  | "dashboard"
  | "operations"
  | "products"
  | "inventory"
  | "pricing"
  | "customers"
  | "pipeline"
  | "quotes"
  | "sales"
  | "orders"
  | "payments"
  | "content"
  | "reports"
  | "audit"
  | "users"
  | "settings";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: AdminNavIcon;
};

type AdminShellProps = {
  children: ReactNode;
  role: AppRole;
  links: AdminNavItem[];
  showUserButton?: boolean;
  activeHref?: string;
};

const iconMap: Record<AdminNavIcon, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  operations: BriefcaseBusiness,
  products: Package,
  inventory: Warehouse,
  pricing: Tag,
  customers: UsersRound,
  pipeline: Workflow,
  quotes: ReceiptText,
  sales: ShoppingCart,
  orders: FileText,
  payments: CreditCard,
  content: Image,
  reports: BarChart3,
  audit: ShieldCheck,
  users: UsersRound,
  settings: Settings2,
};

const profileByRole: Record<string, { name: string; title: string; initial: string }> = {
  SUPERADMIN: { name: "Superadmin", title: "Superadministrador", initial: "S" },
  GERENCIA: { name: "Gerencia", title: "Gerencia", initial: "G" },
  OPERACIONES_VENTAS: { name: "Operaciones y ventas", title: "Operaciones y ventas", initial: "O" },
  JEFATURA: { name: "Gerencia", title: "Gerencia", initial: "G" },
  ADMIN: { name: "Operaciones", title: "Operaciones y ventas", initial: "O" },
  VENTAS: { name: "Ventas", title: "Operaciones y ventas", initial: "V" },
  ALMACEN: { name: "Almacén", title: "Operaciones y ventas", initial: "A" },
  COMPRAS: { name: "Compras", title: "Compras", initial: "C" },
  REPORTES: { name: "Reportes", title: "Reportes", initial: "R" },
  admin: { name: "Administrador", title: "Administrador", initial: "A" },
};

export function AdminShell({
  children,
  role,
  links,
  showUserButton = true,
  activeHref,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const profile = profileByRole[role] ?? {
    name: roleLabel(role),
    title: roleLabel(role),
    initial: "C",
  };
  const compactSidebar =
    role === "OPERACIONES_VENTAS" ||
    role === "ADMIN" ||
    role === "VENTAS" ||
    role === "ALMACEN" ||
    role === "COMPRAS";
  const sidebarWidth = compactSidebar ? "w-[190px]" : "w-[198px]";
  const contentOffset = compactSidebar ? "lg:pl-[190px]" : "lg:pl-[198px]";

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-[#f8fafc] text-[#102a43]">
      {isMenuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#102a43]/25 lg:hidden"
          aria-label="Cerrar menu administrativo"
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex ${sidebarWidth} flex-col border-r border-[#e6edf3] bg-white transition-transform duration-200 lg:translate-x-0 ${isMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-[76px] shrink-0 items-center border-b border-[#eef2f6] px-5">
          <BrandLogo compact size="sm" href="/" />
          <button
            type="button"
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#718096] hover:bg-[#f4f7fa] lg:hidden"
            aria-label="Cerrar menu administrativo"
            onClick={() => setIsMenuOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegacion administrativa">
          <div className="grid gap-1">
            {links.map((link) => {
              const Icon = iconMap[link.icon];
              const linkPath = link.href.split("?")[0];
              const currentQuery = searchParams.toString();
              const linkQuery = link.href.split("?")[1] ?? "";
              const queryScoped = linkPath === "/admin/crm";
              const active =
                activeHref === link.href ||
                (pathname === linkPath && (!queryScoped || currentQuery === linkQuery)) ||
                (linkPath !== "/admin/dashboard" &&
                  pathname.startsWith(`${linkPath}/`) &&
                  (!queryScoped || currentQuery === linkQuery));

              return (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex min-h-9 items-center gap-3 rounded-lg px-2.5 text-[12px] font-semibold transition ${active ? "bg-[#102f51] text-white shadow-[0_4px_10px_rgba(16,47,81,0.16)]" : "text-[#49627d] hover:bg-[#f5f8fb] hover:text-[#102f51]"}`}
                >
                  <Icon
                    className={`h-[17px] w-[17px] shrink-0 ${active ? "text-white" : "text-[#607894]"}`}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="mt-auto space-y-4 px-4 pb-4">
          <details className="group rounded-xl bg-[#12395c] text-white shadow-[0_8px_20px_rgba(18,57,92,0.16)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-white/70">
              <span className="flex items-center gap-2">
                <CircleHelp className="h-4 w-4" aria-hidden="true" />
                Necesitas ayuda?
              </span>
              <ChevronDown
                className="h-4 w-4 transition group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-white/15 px-3 pb-3 pt-2">
              <p className="text-[10px] leading-4 text-[#d7e5f1]">
                Soporte disponible para incidencias del panel.
              </p>
              <Link
                href="/contacto"
                className="mt-2 inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-white/10 text-[10px] font-bold text-white transition hover:bg-white/15"
              >
                <CircleHelp className="h-4 w-4" aria-hidden="true" />
                Contactar soporte
              </Link>
            </div>
          </details>
          <div className="flex items-start gap-2 px-1 text-[10px] text-[#66809c]">
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#20bf6b] ring-4 ring-[#e8f8ef]"
              aria-hidden="true"
            />
            <span>
              <strong className="block text-[10px] text-[#2e4964]">ColdPower Commerce 2.0</strong>
              C&J COLD IMPORT PERÚ E.I.R.L.
            </span>
          </div>
        </div>
      </aside>

      <div className={`min-h-screen min-w-0 ${contentOffset}`}>
        <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-[#e8eef4] bg-white/95 px-4 backdrop-blur sm:px-6 xl:px-5">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#dce6ee] text-[#173654] lg:hidden"
            aria-label="Abrir menu administrativo"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <label className="relative flex min-w-0 max-w-[590px] flex-1 items-center">
            <Search
              className="pointer-events-none absolute left-3.5 h-[17px] w-[17px] text-[#7890a8]"
              aria-hidden="true"
            />
            <input
              className="h-11 w-full rounded-lg border border-[#dce6ee] bg-white pl-10 pr-12 text-[12px] font-semibold text-[#173654] outline-none placeholder:text-[#8aa0b6] focus:border-[#3986c0] focus:ring-2 focus:ring-[#3986c0]/10"
              placeholder="Buscar productos, clientes, pedidos, cotizaciones..."
              aria-label="Buscar en el panel administrativo"
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.currentTarget.value.trim())
                  router.push(
                    `/admin/catalogo?query=${encodeURIComponent(event.currentTarget.value.trim())}`,
                  );
              }}
            />
            <span className="pointer-events-none absolute right-2.5 hidden items-center gap-1 text-[10px] font-bold text-[#8aa0b6] sm:flex">
              <kbd className="rounded border border-[#dce6ee] px-1.5 py-0.5">Ctrl</kbd>
              <kbd className="rounded border border-[#dce6ee] px-1.5 py-0.5">K</kbd>
            </span>
          </label>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Link
              href="/admin/notificaciones"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#173654] transition hover:bg-[#f4f7fa]"
              aria-label="Ver notificaciones"
            >
              <Bell className="h-[19px] w-[19px]" strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <div className="hidden h-8 w-px bg-[#e8eef4] sm:block" />
            {showUserButton ? (
              <UserButton
                appearance={{
                  elements: { avatarBox: "h-10 w-10", userButtonPopoverCard: "shadow-xl" },
                }}
              />
            ) : (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#102f51] text-[12px] font-black text-white">
                {profile.initial}
              </span>
            )}
            <div className="hidden leading-tight sm:block">
              <p className="text-[11px] font-extrabold text-[#173654]">{profile.name}</p>
              <p className="mt-1 text-[9px] font-semibold text-[#8195aa]">{profile.title}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-[#6c8298] sm:block" aria-hidden="true" />
          </div>
        </header>
        <main className="mx-auto min-w-0 w-full max-w-none px-4 py-6 sm:px-6 xl:px-5 xl:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
