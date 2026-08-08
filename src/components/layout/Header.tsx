"use client";

import { Menu, PackageSearch, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { CartButton } from "@/components/cart/CartButton";

const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Refrigeración", href: "/categoria/refrigeracion" },
  { label: "Lavadoras", href: "/categoria/lavadora" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
] as const;

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-white/95 shadow-card backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex min-h-20 items-center gap-4">
          <BrandLogo compact />

          <nav aria-label="Navegación principal" className="hidden flex-1 justify-center lg:flex">
            <ul className="flex items-center gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-pill px-4 py-2 text-sm font-bold text-gray-text transition hover:bg-background hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <form action="/buscar" className="hidden min-w-72 max-w-sm flex-1 xl:block">
            <label className="sr-only" htmlFor="desktop-search">
              Buscar productos
            </label>
            <div className="flex h-11 items-center gap-2 rounded-pill border border-border bg-background px-4 text-gray-text transition focus-within:border-primary focus-within:bg-white">
              <Search className="h-4 w-4" aria-hidden="true" />
              <input
                id="desktop-search"
                name="q"
                type="search"
                placeholder="Busca por equipo, SKU, marca o modelo"
                className="w-full bg-transparent text-sm font-medium text-dark outline-none placeholder:text-gray-text"
              />
            </div>
          </form>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Button href="/cotizacion" variant="primary" size="sm">
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
              Cotización
            </Button>
            <CartButton />
          </div>

          <CartButton className="ml-auto h-11 w-11 lg:hidden" />

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-dark transition hover:border-primary hover:text-primary lg:hidden"
            aria-label="Abrir menú móvil"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <form action="/buscar" className="pb-4 lg:hidden">
          <label className="sr-only" htmlFor="mobile-search">
            Buscar productos
          </label>
          <div className="flex h-11 items-center gap-2 rounded-pill border border-border bg-background px-4 text-gray-text">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input
              id="mobile-search"
              name="q"
              type="search"
              placeholder="Busca por equipo, SKU, marca o modelo"
              className="w-full bg-transparent text-sm font-medium text-dark outline-none placeholder:text-gray-text"
            />
          </div>
        </form>
      </div>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} links={[...navLinks]} />
    </header>
  );
}
