const publicMessages = new Set([
  "El archivo debe tener contenido y no superar 5 MB.",
  "El archivo no contiene hojas.",
  "La hoja supera 1000 filas de datos o 101 columnas.",
  "No se admiten fórmulas; utiliza valores de SKU, local y cantidad.",
  "El archivo debe contener entre 1 y 1000 filas.",
  "No tienes permiso para importar stock.",
  "El archivo cambió o contiene errores. Valida nuevamente.",
  "El lote ya existe con otro estado; revisa su historial.",
  "El local ya no está disponible.",
  "El local se desactivó; valida nuevamente.",
  "El saldo ya tiene existencias o reservas; utiliza un ajuste trazado.",
  "Ya existe un saldo inicial para este producto y local.",
  ...["sku", "locationCode", "quantity"].map(field => `Debe existir una sola columna ${field}.`),
]);

export function stockImportErrorMessage(error: unknown): string {
  return error instanceof Error && publicMessages.has(error.message)
    ? error.message
    : "No se pudo procesar el archivo. Revisa su formato o vuelve a intentarlo.";
}
