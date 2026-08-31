"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type WhatsAppFloatingButtonProps = {
  href: string;
};

/**
 * Botón flotante de WhatsApp.
 * Comportamiento: permanece oculto mientras la sección hero (#hero) está visible
 * y aparece al bajar de ella; vuelve a ocultarse al regresar al hero.
 * En páginas sin hero (sin #hero) se muestra siempre.
 */
export function WhatsAppFloatingButton({ href }: WhatsAppFloatingButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");

    if (!hero) {
      // Sin hero en la página: mostrar siempre (diferido para no llamar setState
      // de forma síncrona dentro del effect).
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Cotizar por WhatsApp"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed bottom-4 right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-float transition-all duration-300 hover:bg-success focus-visible:outline focus-visible:outline-2 sm:bottom-6 sm:right-6 sm:w-auto sm:gap-3 sm:px-5",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
      <span className="hidden text-sm font-extrabold sm:inline">Cotizar por WhatsApp</span>
    </a>
  );
}
