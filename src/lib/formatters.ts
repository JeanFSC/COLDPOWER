const penFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export function formatCurrencyPEN(value: number) {
  return penFormatter.format(value);
}

/** Muestra el precio en PEN, o un texto de "cotizar" cuando el precio aún no fue cargado. */
export function formatProductPrice(value: number | null) {
  return value === null ? "Cotizar precio" : formatCurrencyPEN(value);
}
