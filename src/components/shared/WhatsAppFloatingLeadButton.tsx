"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";

export function WhatsAppFloatingLeadButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("[data-home-block='commercial-access']");
    if (!hero) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 sm:bottom-6 sm:right-6 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`}>
      <WhatsAppLeadButton title="Asesoría general" className="h-14 w-14 rounded-full px-0 shadow-float sm:w-auto sm:gap-3 sm:px-5" aria-label="Cotizar por WhatsApp">
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
        <span className="hidden text-sm font-extrabold sm:inline">Cotizar por WhatsApp</span>
      </WhatsAppLeadButton>
    </div>
  );
}
