"use client";

import { RotateCcw } from "lucide-react";

export const COMPANY_SETTINGS_DISCARD_EVENT = "company-settings-discard";

export function DiscardSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(COMPANY_SETTINGS_DISCARD_EVENT))}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3.5 text-[11px] font-extrabold text-[#304b66] transition hover:border-[#2277ee] hover:text-[#2277ee]"
    >
      <RotateCcw className="h-4 w-4" aria-hidden="true" />
      Descartar
    </button>
  );
}
