"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function AdminDrawer({
  open,
  onClose,
  title,
  children,
  footer,
  size = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide";
}) {
  const titleId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const focusInitialControl = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusInitialControl);
      document.removeEventListener("keydown", onKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="absolute inset-0 bg-[#102a43]/30" aria-label="Cerrar" onClick={onClose} />
      <div ref={drawerRef} className={`relative flex max-h-[92dvh] h-full w-full ${size === "wide" ? "max-w-3xl" : "max-w-md"} flex-col rounded-t-2xl bg-white shadow-[0_18px_50px_rgba(16,42,67,0.18)] sm:max-h-none sm:rounded-l-2xl sm:rounded-t-none`}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#e3ebf2] px-5 py-4 sm:px-6">
          <h2 id={titleId} className="text-base font-semibold text-[#173654]">{title}</h2>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Cerrar" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5b7186] hover:bg-[#f4f7fa]">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? <div className="shrink-0 border-t border-[#e3ebf2] bg-white/95 px-5 py-4 backdrop-blur sm:px-6">{footer}</div> : null}
      </div>
    </div>
  );
}
