"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type AppChromeProps = {
  children: ReactNode;
  publicBefore: ReactNode;
  publicAfter: ReactNode;
};

export function AppChrome({ children, publicBefore, publicAfter }: AppChromeProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <>
        <a href="#main-content" className="sr-only z-[100] rounded-md bg-white px-4 py-3 font-bold text-brand-primary-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Saltar al contenido
        </a>
        <main id="main-content" className="min-h-screen bg-[#f8fafc]">{children}</main>
      </>
    );
  }

  return (
    <>
      <a href="#main-content" className="sr-only z-[100] rounded-md bg-white px-4 py-3 font-bold text-brand-primary-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Saltar al contenido
      </a>
      {publicBefore}
      <main id="main-content" className="flex-1">{children}</main>
      {publicAfter}
    </>
  );
}
