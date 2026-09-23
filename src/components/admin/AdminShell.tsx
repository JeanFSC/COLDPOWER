"use client";

import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileText,
  Home,
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
import { Fragment, useEffect, useState, useTransition, type ReactNode } from "react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { roleLabel, type AppRole } from "@/lib/roles";

export type AdminNavIcon =
  | "home"
  | "dashboard"
  | "operations"
  | "notifications"
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
  section?: string;
};

type AdminShellProps = {
  children: ReactNode;
  role: AppRole;
  links: AdminNavItem[];
  showUserButton?: boolean;
  activeHref?: string;
  unreadNotificationsCount?: number;
  showNotifications?: boolean;
};

type AdminSearchGroup = {
  key: string;
  label: string;
  items: Array<{ id: string; label: string; detail: string; href: string }>;
};

const iconMap: Record<AdminNavIcon, typeof LayoutDashboard> = {
  home: Home,
  dashboard: LayoutDashboard,
  operations: BriefcaseBusiness,
  notifications: Bell,
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
  SUPERADMIN: { name: "Superadmin", title: roleLabel("SUPERADMIN"), initial: "S" },
  GERENCIA: { name: "Gerencia", title: roleLabel("GERENCIA"), initial: "G" },
  OPERACIONES_VENTAS: { name: "Operaciones y ventas", title: roleLabel("OPERACIONES_VENTAS"), initial: "O" },
  JEFATURA: { name: "Gerencia", title: roleLabel("JEFATURA"), initial: "G" },
  ADMIN: { name: "Operaciones", title: roleLabel("ADMIN"), initial: "O" },
  VENTAS: { name: "Ventas", title: roleLabel("VENTAS"), initial: "V" },
  ALMACEN: { name: "Almacén", title: roleLabel("ALMACEN"), initial: "A" },
  COMPRAS: { name: "Compras", title: roleLabel("COMPRAS"), initial: "C" },
  REPORTES: { name: "Reportes", title: roleLabel("REPORTES"), initial: "R" },
  admin: { name: "Administrador", title: roleLabel("admin"), initial: "A" },
};

export function AdminShell({
  children,
  role,
  links,
  showUserButton = true,
  activeHref,
  unreadNotificationsCount = 0,
  showNotifications = true,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [searchGroups, setSearchGroups] = useState<AdminSearchGroup[]>([]);
  const [searchResultQuery, setSearchResultQuery] = useState("");
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [isNavigating, startNavigation] = useTransition();
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
  // Every admin module shares identical shell dimensions (sidebar, header,
  // main padding) regardless of route — the Operations Center used to get a
  // denser shell via a page-specific override, but that made the sidebar and
  // topbar visibly change size when navigating between modules. Removed so
  // the shell is dimensionally identical everywhere.
  const sidebarWidth = compactSidebar ? "w-[190px]" : "w-[198px]";
  const contentOffset = compactSidebar ? "xl:pl-[190px]" : "xl:pl-[198px]";
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandOpen(true);
      }
      if (event.key === "Escape") setIsCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => {
    const query = commandQuery.trim();
    if (!isCommandOpen || query.length < 2) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/admin/busqueda?q=${encodeURIComponent(query)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("search_unavailable");
        const payload = await response.json() as { groups?: AdminSearchGroup[] };
        setSearchGroups(Array.isArray(payload.groups) ? payload.groups : []);
        setSearchResultQuery(query);
        setSearchState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchGroups([]);
        setSearchResultQuery(query);
        setSearchState("unavailable");
      });
    return () => controller.abort();
  }, [commandQuery, isCommandOpen]);
  const normalizedCommandQuery = commandQuery.trim();
  const isSearchPending = isCommandOpen && normalizedCommandQuery.length >= 2 && searchResultQuery !== normalizedCommandQuery;
  const visibleSearchGroups = searchResultQuery === normalizedCommandQuery ? searchGroups : [];
  const commandLinks = links.filter((link) => {
    const query = commandQuery.trim().toLowerCase();
    return !query || `${link.label} ${link.href}`.toLowerCase().includes(query);
  }).slice(0, 8);
  function recordRecent(label: string, href: string) {
    void fetch("/api/admin/inicio/recientes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType: "module", entityId: href, label, href }), keepalive: true }).catch(() => undefined);
  }

  return (
    <div className="admin-shell min-h-screen min-w-0 overflow-x-clip bg-[#f8fafc] text-[#102a43]">
      {isMenuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#102a43]/25 xl:hidden"
          aria-label="Cerrar menu administrativo"
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex ${sidebarWidth} flex-col border-r border-[#e6edf3] bg-white transition-transform duration-200 xl:translate-x-0 ${isMenuOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}`}
      >
        <div className="flex h-[76px] shrink-0 items-center border-b border-[#eef2f6] px-5">
          <BrandLogo compact size="sm" href="/" />
          <button
            type="button"
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#718096] hover:bg-[#f4f7fa] xl:hidden"
            aria-label="Cerrar menu administrativo"
            onClick={() => setIsMenuOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Navegacion administrativa">
          <div className="grid gap-1">
            {links.map((link, index) => {
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
                <Fragment key={`${link.href}-${link.label}`}>
                  {link.section && link.section !== links[index - 1]?.section ? (
                    <p className="mb-1 mt-4 px-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#91a3b3] first:mt-0">
                      {link.section}
                    </p>
                  ) : null}
                  <Link
                    href={link.href}
                    onClick={() => { setIsMenuOpen(false); recordRecent(link.label, link.href); }}
                    className={`flex min-h-9 items-center gap-3 rounded-lg px-2.5 text-[12px] font-semibold transition ${active ? "bg-[#102f51] text-white shadow-[0_4px_10px_rgba(16,47,81,0.16)]" : "text-[#49627d] hover:bg-[#f5f8fb] hover:text-[#102f51]"}`}
                  >
                    <Icon
                      className={`h-[17px] w-[17px] shrink-0 ${active ? "text-white" : "text-[#607894]"}`}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    <span className="truncate">{link.label}</span>
                  </Link>
                </Fragment>
              );
            })}
          </div>
        </nav>
        <div className="mt-auto shrink-0 space-y-4 px-4 pb-4">
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
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#dce6ee] text-[#173654] xl:hidden"
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
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.currentTarget.value)}
              className="h-11 w-full rounded-lg border border-[#dce6ee] bg-white pl-10 pr-12 text-[12px] font-semibold text-[#173654] outline-none placeholder:text-[#8aa0b6] focus:border-[#3986c0] focus:ring-2 focus:ring-[#3986c0]/10"
              placeholder="Buscar productos, clientes, pedidos, cotizaciones..."
              aria-label="Buscar en el panel administrativo"
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                  event.preventDefault();
                  setIsCommandOpen(true);
                  return;
                }
                const query = event.currentTarget.value.trim();
                if (event.key === "Enter" && query) {
                  // startTransition keeps the input responsive (marks the
                  // navigation as non-urgent) and exposes isNavigating so we
                  // can show immediate feedback while the RSC payload streams.
                  startNavigation(() => {
                    router.push(`/admin/catalogo?query=${encodeURIComponent(query)}`);
                  });
                }
              }}
            />
            <span
              className={`pointer-events-none absolute right-2.5 hidden items-center gap-1 text-[10px] font-bold text-[#8aa0b6] sm:flex ${isNavigating ? "opacity-0" : ""}`}
            >
              <kbd className="rounded border border-[#dce6ee] px-1.5 py-0.5">Ctrl</kbd>
              <kbd className="rounded border border-[#dce6ee] px-1.5 py-0.5">K</kbd>
            </span>
            {isNavigating ? (
              <span
                className="absolute right-3.5 h-4 w-4 animate-spin rounded-full border-2 border-[#dce6ee] border-t-[#2277ee]"
                aria-hidden="true"
              />
            ) : null}
          </label>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {showNotifications ? (
              <Link
                href="/admin/notificaciones"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#173654] transition hover:bg-[#f4f7fa]"
                aria-label="Ver notificaciones"
              >
                <Bell className="h-[19px] w-[19px]" strokeWidth={1.8} aria-hidden="true" />
                {unreadNotificationsCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f97316] px-1 text-[10px] font-semibold text-white">
                    {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
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
        {isCommandOpen ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#102a43]/25 px-4 pt-[12vh]" role="presentation" onMouseDown={() => setIsCommandOpen(false)}>
            <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#dce6ee] bg-white shadow-[0_22px_60px_rgba(16,42,67,0.22)]" role="dialog" aria-modal="true" aria-label="Paleta de comandos" onMouseDown={(event) => event.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-[#edf2f6] px-4 py-3"><Search className="h-4 w-4 text-[#7890a8]" aria-hidden="true" /><input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Escape") setIsCommandOpen(false); }} placeholder="Ir a un módulo..." className="min-w-0 flex-1 text-[12px] font-semibold text-[#173654] outline-none placeholder:text-[#8aa0b6]" aria-label="Buscar módulo" /><kbd className="rounded border border-[#dce6ee] px-1.5 py-0.5 text-[10px] font-bold text-[#8aa0b6]">Esc</kbd></div>
              <nav className="max-h-[55vh] overflow-y-auto p-2" aria-label="Resultados y módulos disponibles">
                {visibleSearchGroups.map((searchGroup) => <div key={searchGroup.key} className="mb-2 last:mb-0"><p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#91a3b3]">{searchGroup.label}</p>{searchGroup.items.map((item) => <Link key={`${searchGroup.key}-${item.id}`} href={item.href} onClick={() => { setIsCommandOpen(false); recordRecent(searchGroup.label, item.href); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-bold text-[#304b66] hover:bg-[#f4f8fc]"><Search className="h-4 w-4 shrink-0 text-[#2277ee]" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate">{item.label}</span><span className="mt-0.5 block truncate text-[10px] font-semibold text-[#91a3b3]">{item.detail || "Resultado"}</span></span></Link>)}</div>)}
                {isSearchPending ? <p className="px-3 py-3 text-[11px] font-semibold text-[#8195aa]">Buscando entidades…</p> : null}
                {searchState === "unavailable" ? <p className="px-3 py-3 text-[11px] font-semibold text-[#b45309]">Búsqueda de entidades no disponible.</p> : null}
                {commandLinks.length ? <div className="border-t border-[#edf2f6] pt-2"><p className="px-3 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#91a3b3]">Módulos</p>{commandLinks.map((link) => { const Icon = iconMap[link.icon]; return <Link key={`command-${link.href}`} href={link.href} onClick={() => { setIsCommandOpen(false); recordRecent(link.label, link.href); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-bold text-[#304b66] hover:bg-[#f4f8fc]"><Icon className="h-4 w-4 text-[#2277ee]" aria-hidden="true" /><span className="flex-1">{link.label}</span><span className="text-[10px] font-semibold text-[#91a3b3]">{link.href}</span></Link>; })}</div> : null}
                {!visibleSearchGroups.length && !isSearchPending && searchState === "ready" && !commandLinks.length ? <p className="px-3 py-5 text-center text-[11px] font-semibold text-[#8195aa]">No hay coincidencias con permisos disponibles.</p> : null}
              </nav>
            </section>
          </div>
        ) : null}
        <main
          className="mx-auto min-w-0 w-full max-w-none px-4 py-6 sm:px-6 xl:px-5 xl:py-5"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
