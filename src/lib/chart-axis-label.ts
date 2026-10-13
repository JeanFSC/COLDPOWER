/** Compact chart axes retain cents below one thousand, including the empty 0–1 domain. */
export function formatSalesAxisValue(value: number, currency: string | null | undefined) {
  if (!Number.isFinite(value) || !currency) return "N/D";
  const symbol = currency === "USD" ? "US$" : currency === "PEN" ? "S/" : currency;
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${symbol} ${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${symbol} ${(value / 1_000).toFixed(absolute >= 10_000 ? 0 : 1)}k`;
  return `${symbol} ${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(value)}`;
}
