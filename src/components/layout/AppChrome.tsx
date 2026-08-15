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
    return <main id="main-content" className="min-h-screen bg-[#f8fafc]">{children}</main>;
  }

  return (
    <>
      {publicBefore}
      <main id="main-content" className="flex-1">{children}</main>
      {publicAfter}
    </>
  );
}
