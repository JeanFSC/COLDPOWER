export function supplierReceiptPresentation(status: string) {
  if (status === "POSTED") return { label: "registrada", dotClass: "bg-[#0b9f68] ring-[#96dfbd]" };
  if (status === "CANCELLED") return { label: "cancelada", dotClass: "bg-[#b42318] ring-[#f2c7c7]" };
  return { label: "estado no reconocido", dotClass: "bg-slate-500 ring-slate-300" };
}
