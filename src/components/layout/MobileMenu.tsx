"use client";

import { MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { categories } from "@/data/categories";
import { company } from "@/data/company";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/shared/Button";
import { BrandLogo } from "@/components/shared/BrandLogo";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  links: Array<{
    label: string;
    href: string;
  }>;
};

const whatsappHref = createWhatsAppLink({
  phone: company.whatsapp,
  message: "Hola ColdPower, deseo recibir asesoría para cotizar un equipo o repuesto de refrigeración.",
});

export function MobileMenu({ isOpen, onClose, links }: MobileMenuProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Cerrar menú móvil"
        className="absolute inset-0 bg-dark/60"
        onClick={onClose}
      />

      <aside
        className="absolute right-0 top-0 flex h-full w-[min(88vw,390px)] flex-col bg-white shadow-float"
        aria-label="Menú principal móvil"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <BrandLogo compact />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-dark transition hover:border-primary hover:text-primary"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <nav aria-label="Links principales" className="grid gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-3 text-base font-extrabold text-dark transition hover:bg-background hover:text-primary"
                onClick={onClose}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-7">
            <p className="px-3 text-xs font-extrabold uppercase tracking-[0.16em] text-gray-text">
              Categorías
            </p>
            <div className="mt-3 grid gap-1">
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category.id}
                  href={`/categoria/${category.slug}`}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-gray-text transition hover:bg-background hover:text-primary"
                  onClick={onClose}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border p-5">
          <Button
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            className="w-full"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Cotizar por WhatsApp
          </Button>
        </div>
      </aside>
    </div>
  );
}
