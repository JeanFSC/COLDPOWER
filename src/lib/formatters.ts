const penFormatter = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });
export function formatCurrencyPEN(value: number) { return penFormatter.format(value); }
export function formatProductPrice(value: number | null, currency = "PEN") { if (value === null) return "Cotizar precio"; try { return new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 2 }).format(value); } catch { return `${currency} ${value.toFixed(2)}`; } }
