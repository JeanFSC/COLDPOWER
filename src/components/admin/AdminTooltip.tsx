"use client";

import { useId, useState, type ReactNode } from "react";

export function AdminTooltip({ label, children }: { label: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex items-center">
      <span
        tabIndex={0}
        aria-describedby={tooltipId}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="inline-flex cursor-help"
      >
        {children}
      </span>
      {visible ? <span id={tooltipId} role="tooltip" className="absolute bottom-full left-1/2 z-40 mb-2 w-64 -translate-x-1/2 rounded-md bg-[#173654] px-3 py-2 text-xs leading-relaxed text-white shadow-lg">{label}</span> : null}
    </span>
  );
}
