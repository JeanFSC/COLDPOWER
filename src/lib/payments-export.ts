import * as XLSX from "xlsx";
import type { PaymentListItem } from "./payments-contract";
import { paymentMethodLabel } from "./payment-display";

const headers = ["Pago", "Pedido", "Venta", "Cliente", "Monto", "Moneda", "Método", "Proveedor", "Referencia", "Estado", "Esperado", "Neto recibido", "Diferencia", "Conciliación", "Intentos", "Fecha"];
const labels: Record<string, string> = {
  PENDING: "Pendiente", UNDER_REVIEW: "En revisión", CONFIRMED: "Confirmado",
  APPROVED: "Aprobado", REJECTED: "Rechazado", CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado", REFUND_REQUIRED: "Por reembolsar", ERROR: "Error",
  MATCH: "Conciliado", UNDERPAID: "Faltante", OVERPAID: "Sobrepago",
};

export function paymentsWorkbook(items: PaymentListItem[]): Uint8Array {
  const rows = items.map((item) => [
    item.id, item.orderCode, item.saleCode, item.customerName,
    Number(item.amount), item.currency, paymentMethodLabel(item.method), item.provider,
    item.providerReference, labels[item.status] ?? item.status,
    Number(item.expectedAmount), Number(item.netReceivedAmount), Number(item.difference),
    labels[item.reconciliation] ?? item.reconciliation, item.attempts,
    // Preserve the instant explicitly; Excel dates have no timezone.
    item.createdAt.toISOString(),
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = headers.map((_, index) => ({ wch: index === 3 ? 34 : index === 15 ? 27 : index === 0 ? 44 : 20 }));
  sheet["!autofilter"] = { ref: `A1:P${items.length + 1}` };
  for (let row = 2; row <= items.length + 1; row++) {
    for (const column of ["E", "K", "L", "M"]) sheet[`${column}${row}`].z = "#,##0.00";
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Pagos");
  return new Uint8Array(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
}
