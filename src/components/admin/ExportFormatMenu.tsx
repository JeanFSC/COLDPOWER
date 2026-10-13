"use client";

import { Download } from "lucide-react";
import { exportFormatHref, type ExportFormat } from "@/lib/export-format-href";

const formatLabels: Record<ExportFormat, string> = {
  xlsx: "Excel (.xlsx)",
  csv: "CSV (.csv)",
  pdf: "PDF (.pdf)",
};

export function ExportFormatMenu({ href, label, formats, mobileAlign = "end" }: {
  href: string;
  label: string;
  formats: ExportFormat[];
  mobileAlign?: "start" | "end";
}) {
  return (
    <details className="relative z-30 shrink-0" onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }
    }}>
      <summary aria-label={label} className="inline-flex h-11 cursor-pointer list-none items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:h-9 [&::-webkit-details-marker]:hidden">
        <Download className="h-3.5 w-3.5" aria-hidden="true" />Exportar
      </summary>
      <div className={`absolute top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ${mobileAlign === "start" ? "left-0 sm:left-auto sm:right-0" : "right-0"}`} aria-label={`Formatos de ${label.toLocaleLowerCase("es")}`}>
        {formats.map(format => <a key={format} href={exportFormatHref(href, format)} download className="flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600">{formatLabels[format]}</a>)}
      </div>
    </details>
  );
}
