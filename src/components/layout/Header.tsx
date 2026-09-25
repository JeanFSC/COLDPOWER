"use client";

import { ClerkFailed, ClerkLoaded, ClerkLoading, Show, UserButton } from "@clerk/nextjs";
import { Menu, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { CatalogCategory } from "@/lib/catalog-repository";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { SearchBar } from "@/components/shared/SearchBar";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { CartButton } from "@/components/cart/CartButton";
import { QuoteListButton } from "@/components/cart/QuoteListButton";

const searchPlaceholder = "Busca por código, modelo, marca o producto...";

function SignedOutAccountAction() {
  return (
    <Link href="/sign-in" className="home-account-action">
      <UserRound aria-hidden="true" />
      <span><strong>Mi cuenta</strong><small>Ingresar</small></span>
    </Link>
  );
}

function AuthAccountAction({ devAuthUserId }: { devAuthUserId?: string | null }) {
  if (devAuthUserId) {
    return (
      <Link href="/cuenta" className="home-account-action">
        <UserRound aria-hidden="true" />
        <span><strong>Mi cuenta</strong><small>Ver cuenta</small></span>
      </Link>
    );
  }

  return (
    <>
      <ClerkLoading><SignedOutAccountAction /></ClerkLoading>
      <ClerkFailed><SignedOutAccountAction /></ClerkFailed>
      <ClerkLoaded>
        <Show when="signed-in">
          <div className="flex items-center gap-2">
            <Link href="/cuenta" className="home-account-action">
              <UserRound aria-hidden="true" />
              <span><strong>Mi cuenta</strong><small>Ver cuenta</small></span>
            </Link>
            <UserButton />
          </div>
        </Show>
        <Show when="signed-out"><SignedOutAccountAction /></Show>
      </ClerkLoaded>
    </>
  );
}

export function Header({ authEnabled = false, categories, devAuthUserId }: { authEnabled?: boolean; categories: CatalogCategory[]; devAuthUserId?: string | null }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isHome = pathname === "/";

  return (
    <>
      <header className="home-header">
        <div className="home-wide-container home-header-inner">
          <BrandLogo size="lg" showTagline priority className="home-header-logo" />
          <div className="home-header-search hidden lg:block">
            <SearchBar id="desktop-search" placeholder={searchPlaceholder} compact={false} showCompactSubmit={false} iconOnlySubmit />
          </div>
          <div className="home-header-actions">
            <QuoteListButton showCount className="home-quote-button" />
            {!isAuthPage ? (authEnabled ? <AuthAccountAction devAuthUserId={devAuthUserId} /> : <SignedOutAccountAction />) : null}
            <CartButton showLabel className="home-cart-button" />
          </div>
          <div className="home-mobile-actions">
            {isHome ? <Link href="/buscar" aria-label="Buscar" className="home-mobile-icon"><Search aria-hidden="true" /></Link> : null}
            <Link href="/cuenta" aria-label="Abrir Mi cuenta" className="home-mobile-icon"><UserRound aria-hidden="true" /></Link>
            <QuoteListButton compact className="home-mobile-icon" />
            <CartButton className="home-mobile-icon" />
            <button type="button" className="home-mobile-icon" aria-label="Abrir menú móvil" aria-expanded={isMenuOpen} aria-controls="mobile-menu" onClick={() => setIsMenuOpen(true)}><Menu aria-hidden="true" /></button>
          </div>
        </div>
        {!isHome ? <div className="home-mobile-search lg:hidden"><SearchBar id="mobile-search" placeholder={searchPlaceholder} /></div> : null}
      </header>
      <MobileMenu id="mobile-menu" isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} links={[{ label: "Inicio", href: "/" }, { label: "Catálogo", href: "/catalogo" }, { label: "FAQ", href: "/faq" }, { label: "Nosotros", href: "/nosotros" }, { label: "Contacto", href: "/contacto" }]} authEnabled={authEnabled} categories={categories} />
    </>
  );
}
