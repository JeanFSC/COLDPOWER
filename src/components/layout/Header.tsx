"use client";

import { Menu, Scale, UserRound, UserPlus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ClerkFailed, ClerkLoaded, ClerkLoading, Show, UserButton } from "@clerk/nextjs";
import type { CatalogCategory } from "@/lib/catalog-repository";
import { Button } from "@/components/shared/Button";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { SearchBar } from "@/components/shared/SearchBar";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { TechnicalNav } from "@/components/layout/TechnicalNav";
import { CartButton } from "@/components/cart/CartButton";
import { QuoteListButton } from "@/components/cart/QuoteListButton";

const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "FAQ", href: "/faq" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
] as const;

const searchPlaceholder = "Busca por código, modelo, marca o producto...";

function SignedOutHeaderActions() {
  return (
    <div className="hidden items-center gap-1 xl:flex">
      <Button href="/sign-in" variant="ghost" size="sm">
        <UserRound className="h-4 w-4" aria-hidden="true" />
        Ingresar
      </Button>
      <Button href="/sign-up" variant="outline" size="sm">
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Crear cuenta
      </Button>
    </div>
  );
}

function AuthHeaderActions() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return <div className="h-9 w-28 animate-pulse rounded-md bg-slate-100" aria-label="Cargando sesión" />;
  }

  return (
    <>
      <ClerkLoading>
        <div className="h-9 w-28 animate-pulse rounded-md bg-slate-100" aria-label="Cargando sesión" />
      </ClerkLoading>
      <ClerkFailed>
        <SignedOutHeaderActions />
      </ClerkFailed>
      <ClerkLoaded>
        <div className="hidden items-center gap-1 xl:flex">
          <Show when="signed-in">
            <Button href="/cuenta" variant="ghost" size="sm">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Mi cuenta
            </Button>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <Button href="/sign-in" variant="ghost" size="sm">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Ingresar
            </Button>
            <Button href="/sign-up" variant="outline" size="sm">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Crear cuenta
            </Button>
          </Show>
        </div>
      </ClerkLoaded>
    </>
  );
}

export function Header({ authEnabled = false, categories }: { authEnabled?: boolean; categories: CatalogCategory[] }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  return (
    <>
      <header className="sticky top-0 z-40 min-w-0 border-b border-border bg-white/95 shadow-card backdrop-blur">
        <div className="cp-container">
          <div className="flex min-h-[72px] min-w-0 items-center gap-3 py-3">
            <BrandLogo size="sm" className="min-w-0" />
            <div className="hidden min-w-0 flex-1 lg:block">
              <SearchBar id="desktop-search" compact showCompactSubmit placeholder={searchPlaceholder} className="min-w-0" />
              <p className="mt-1 truncate pl-4 text-[10px] font-medium text-text-secondary">Ej.: Embraco, R404A, termostato, 6871JB1103H...</p>
            </div>
            <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
              {!isAuthPage ? (authEnabled ? <AuthHeaderActions /> : <SignedOutHeaderActions />) : null}
              <Button href="/comparar" variant="ghost" size="sm" aria-label="Abrir comparador técnico">
                <Scale className="h-4 w-4" aria-hidden="true" />
                <span className="hidden 2xl:inline">Comparar</span>
              </Button>
              <QuoteListButton showCount />
              <CartButton showLabel />
            </div>
            <div className="ml-auto flex items-center gap-2 lg:hidden">
              <QuoteListButton compact className="h-11 w-11" />
              <CartButton className="h-11 w-11" />
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-brand-primary-900 transition hover:border-brand-secondary-600 hover:text-brand-secondary-600"
                aria-label="Abrir menú móvil"
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
                onClick={() => setIsMenuOpen(true)}
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>
          <SearchBar id="mobile-search" placeholder={searchPlaceholder} compact showCompactSubmit className="pb-3 lg:hidden" />
        </div>
        <div className="hidden lg:block"><TechnicalNav categories={categories} /></div>
      </header>
      <MobileMenu id="mobile-menu" isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} links={[...navLinks]} authEnabled={authEnabled} categories={categories} />
    </>
  );
}
