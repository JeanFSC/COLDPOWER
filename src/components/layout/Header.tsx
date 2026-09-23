"use client";

import { ClerkFailed, ClerkLoaded, ClerkLoading, Show, UserButton } from "@clerk/nextjs";
import { Menu, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { CatalogCategory } from "@/lib/catalog-repository";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { SearchBar } from "@/components/shared/SearchBar";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { CartButton } from "@/components/cart/CartButton";
import { QuoteListButton } from "@/components/cart/QuoteListButton";

const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "FAQ", href: "/faq" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
] as const;

const searchPlaceholder = "Busca por SKU, modelo o marca";

function SignedOutAccountAction() {
  return (
    <Link href="/sign-in" className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold text-brand-primary-900 transition hover:bg-surface-page hover:text-brand-secondary-600">
      <UserRound className="h-4 w-4" aria-hidden="true" />
      <span>Mi cuenta</span>
    </Link>
  );
}

function AuthAccountAction() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  if (!mounted) return <span className="h-10 w-28 animate-pulse rounded-md bg-surface-page" aria-label="Cargando sesión" />;

  return (
    <>
      <ClerkLoading><span className="h-10 w-28 animate-pulse rounded-md bg-surface-page" aria-label="Cargando sesión" /></ClerkLoading>
      <ClerkFailed><SignedOutAccountAction /></ClerkFailed>
      <ClerkLoaded>
        <Show when="signed-in">
          <div className="flex items-center gap-2">
            <Link href="/cuenta" className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold text-brand-primary-900 transition hover:bg-surface-page hover:text-brand-secondary-600">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              <span>Mi cuenta</span>
            </Link>
            <UserButton />
          </div>
        </Show>
        <Show when="signed-out"><SignedOutAccountAction /></Show>
      </ClerkLoaded>
    </>
  );
}

export function Header({ authEnabled = false, categories }: { authEnabled?: boolean; categories: CatalogCategory[] }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isHome = pathname === "/";

  return (
    <>
      <header className="sticky top-0 z-40 min-w-0 border-b border-border bg-white/95 shadow-card backdrop-blur">
        <div className="cp-container">
          <div className="flex min-h-[72px] min-w-0 items-center gap-3 py-3">
            <BrandLogo size="sm" className="min-w-0" />
            <div className="hidden min-w-0 flex-1 lg:block">
              {isHome ? (
                <Link href="/buscar" aria-label="Abrir búsqueda" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-brand-primary-900 transition hover:border-brand-secondary-600 hover:text-brand-secondary-600">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Link>
              ) : (
                <SearchBar id="desktop-search" compact showCompactSubmit placeholder={searchPlaceholder} className="min-w-0" />
              )}
            </div>
            <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
              {!isAuthPage ? (authEnabled ? <AuthAccountAction /> : <SignedOutAccountAction />) : null}
              <QuoteListButton showCount />
              <CartButton showLabel />
            </div>
            <div className="ml-auto flex items-center gap-2 lg:hidden">
              {isHome ? (
                <Link href="/buscar" aria-label="Abrir búsqueda" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-brand-primary-900 transition hover:border-brand-secondary-600 hover:text-brand-secondary-600">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Link>
              ) : null}
              <Link href="/cuenta" aria-label="Abrir Mi cuenta" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-brand-primary-900 transition hover:border-brand-secondary-600 hover:text-brand-secondary-600">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </Link>
              <QuoteListButton compact className="h-11 w-11" />
              <CartButton className="h-11 w-11" />
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-brand-primary-900 transition hover:border-brand-secondary-600 hover:text-brand-secondary-600" aria-label="Abrir menú móvil" aria-expanded={isMenuOpen} aria-controls="mobile-menu" onClick={() => setIsMenuOpen(true)}>
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>
          {!isHome ? <SearchBar id="mobile-search" placeholder={searchPlaceholder} className="pb-3 lg:hidden" /> : null}
        </div>
      </header>
      <MobileMenu id="mobile-menu" isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} links={[...navLinks]} authEnabled={authEnabled} categories={categories} />
    </>
  );
}
