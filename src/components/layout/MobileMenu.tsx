"use client";

import { ClerkFailed, ClerkLoaded, ClerkLoading, Show } from "@clerk/nextjs";
import { MessageCircle, User, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import type { CatalogCategory } from "@/lib/catalog-repository";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/shared/Button";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";

type MobileMenuProps = {
  id?: string;
  isOpen: boolean;
  onClose: () => void;
  links: Array<{ label: string; href: string }>;
  authEnabled?: boolean;
  categories: CatalogCategory[];
};

function SignedOutMobileActions({ onClose }: { onClose: () => void }) {
  return (
    <div className="grid gap-2">
      <Button href="/sign-in" variant="outline" className="w-full" onClick={onClose}>
        <User className="h-5 w-5" aria-hidden="true" />
        Iniciar sesión
      </Button>
      <Button href="/sign-up" variant="secondary" className="w-full" onClick={onClose}>
        <UserPlus className="h-5 w-5" aria-hidden="true" />
        Registrarse
      </Button>
    </div>
  );
}

function AuthMobileActions({ onClose }: { onClose: () => void }) {
  return (
    <>
      <ClerkLoading>
        <div className="h-[88px] animate-pulse rounded-md bg-slate-100" aria-label="Cargando sesión" />
      </ClerkLoading>
      <ClerkFailed>
        <SignedOutMobileActions onClose={onClose} />
      </ClerkFailed>
      <ClerkLoaded>
        <Show when="signed-in">
          <Button href="/cuenta" variant="outline" className="w-full" onClick={onClose}>
            <User className="h-5 w-5" aria-hidden="true" />
            Mi cuenta
          </Button>
        </Show>
        <Show when="signed-out">
          <SignedOutMobileActions onClose={onClose} />
        </Show>
      </ClerkLoaded>
    </>
  );
}

export function MobileMenu({ id = "mobile-menu", isOpen, onClose, links, authEnabled = false, categories }: MobileMenuProps) {
  const publicCategories = categories.filter((category) => category.productCount > 0).slice(0, 8);
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div id={id} className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú principal móvil">
      <button type="button" aria-label="Cerrar menú móvil" className="absolute inset-0 bg-dark/60" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-[min(88vw,390px)] flex-col bg-white shadow-float">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <BrandLogo compact />
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-dark transition hover:border-primary hover:text-primary" onClick={onClose} aria-label="Cerrar menú">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <nav aria-label="Links principales" className="grid gap-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md px-3 py-3 text-base font-extrabold text-dark transition hover:bg-background hover:text-primary" onClick={onClose}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-7">
            <p className="px-3 text-xs font-extrabold uppercase tracking-[0.16em] text-gray-text">Categorías</p>
            <div className="mt-3 grid gap-1">
              {publicCategories.length > 0 ? publicCategories.map((category) => (
                <Link key={category.id} href={`/categoria/${category.slug}`} className="rounded-md px-3 py-2 text-sm font-semibold text-gray-text transition hover:bg-background hover:text-primary" onClick={onClose}>
                  {category.name}
                </Link>
              )) : <Link href="/catalogo" className="rounded-md px-3 py-2 text-sm font-semibold text-gray-text transition hover:bg-background hover:text-primary" onClick={onClose}>Explorar catálogo</Link>}
            </div>
          </div>
        </div>
        <div className="border-t border-border p-5">
          <div className="mb-3 grid gap-2">
            {authEnabled ? <AuthMobileActions onClose={onClose} /> : <SignedOutMobileActions onClose={onClose} />}
          </div>
          <WhatsAppLeadButton title="Solicitud desde menú móvil" variant="whatsapp" className="w-full">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Cotizar por WhatsApp
          </WhatsAppLeadButton>
        </div>
      </aside>
    </div>
  );
}
