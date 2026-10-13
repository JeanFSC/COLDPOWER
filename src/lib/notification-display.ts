const eventLabels: Record<string, string> = {
  CONTACT_SUBMITTED: "Consulta de contacto",
  LEAD_CREATED: "Lead nuevo",
  INVENTORY_CRITICAL: "Stock crítico",
  INVENTORY_LOW: "Stock bajo",
  FOLLOW_UP_OVERDUE: "Seguimiento vencido",
  PAYMENT_APPROVED: "Pago aprobado",
  PAYMENT_FAILED: "Pago fallido",
  ORDER_CREATED: "Pedido nuevo",
  ORDER_READY: "Pedido listo",
  SALE_CREATED: "Venta registrada",
  QUOTE_DISCOUNT_PENDING: "Descuento de cotización pendiente",
  TRANSFER_UPDATED: "Transferencia actualizada",
  MANUAL: "Aviso manual",
  SCHEDULED: "Aviso programado",
  SCHEDULED_REPORT: "Reporte programado",
};

export function notificationPriority(notification: { type: string; metadata: Record<string, unknown> | null }): "Alta" | "Media" | "Baja" {
  const severity = notification.metadata?.severity;
  if (severity === "CRITICAL") return "Alta";
  if (severity === "WARNING") return "Media";
  if (severity === "INFO") return "Baja";
  if (/CRITICAL|FAILED|OVERDUE|URGENT|BLOCKED/i.test(notification.type)) return "Alta";
  if (/PENDING|REVIEW|WARNING|LOW$/i.test(notification.type)) return "Media";
  return "Baja";
}

export function notificationEventLabel(value: string) {
  return eventLabels[value] ?? value.toLowerCase().replaceAll("_", " ").replace(/^./, (char) => char.toUpperCase());
}

const bodyReplacements: Array<[RegExp, string]> = [
  [/\bBRIEF17R3-[A-Z0-9]+-[A-F0-9]+\b/gi, "notificación de prueba automatizada"],
  [/\bBRIEF17R3-[A-Z0-9]+\b/gi, "notificación de prueba automatizada"],
  [/\bEl proveedor mock\b/gi, "La pasarela de prueba"],
  [/\bdel proveedor mock\b/gi, "de la pasarela de prueba"],
  [/\bproveedor mock\b/gi, "la pasarela de prueba"],
  [/\bmock\b/gi, "pasarela de prueba"],
  [/\bCONFIRMED\b/g, "confirmado"],
  [/\bAPPROVED\b/g, "aprobado"],
  [/\bPENDING\b/g, "pendiente"],
  [/\bFAILED\b/g, "fallido"],
  [/\bREJECTED\b/g, "rechazado"],
];

export function notificationBodyLabel(value: string) {
  return bodyReplacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}
