export function formatAdminMoney(value: number | string | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined || !currency || (typeof value === "string" && !value.trim()) || !Number.isFinite(Number(value))) return "N/D";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
}
