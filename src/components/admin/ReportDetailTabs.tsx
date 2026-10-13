"use client";

import { useId, useRef, useState, type ReactNode } from "react";

export function ReportDetailTabs({ children, inventory, customers }: { children: ReactNode; inventory: ReactNode; customers: ReactNode }) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const names = ["Ventas", "Inventario", "Clientes"];
  return <>
    <div role="tablist" aria-label="Detalle de reportes" className="flex gap-6 border-b border-slate-100 px-5 pt-4 text-xs font-semibold">
      {names.map((name, index) => <button key={name} ref={(node) => { refs.current[index] = node; }} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} className={`pb-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${selected === index ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-800"}`} onClick={() => setSelected(index)} onKeyDown={(event) => {
        const next = event.key === "ArrowRight" ? (index + 1) % 3 : event.key === "ArrowLeft" ? (index + 2) % 3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : null;
        if (next !== null) { event.preventDefault(); setSelected(next); refs.current[next]?.focus(); }
      }}>{name}</button>)}
    </div>
    {[children, inventory, customers].map((content, index) => <div key={index} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={selected !== index} tabIndex={0}>{content}</div>)}
  </>;
}
