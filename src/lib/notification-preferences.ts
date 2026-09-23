export const notificationPreferenceOptions = [
  { key: "QUOTE_CREATED", label: "Cotizaciones nuevas", description: "Avisos de cotizaciones creadas." },
  { key: "LEAD_CREATED", label: "Leads nuevos", description: "Avisos de nuevos leads comerciales." },
  { key: "PAYMENT_APPROVED", label: "Pagos aprobados", description: "Confirmaciones de pagos aprobados." },
  { key: "PAYMENT_FAILED", label: "Pagos fallidos", description: "Alertas de pagos que requieren atención." },
  { key: "ORDER_CREATED", label: "Pedidos nuevos", description: "Avisos de pedidos recibidos." },
  { key: "ORDER_READY", label: "Pedidos listos", description: "Avisos de pedidos listos para entrega." },
  { key: "SALE_CREATED", label: "Ventas registradas", description: "Avisos de ventas confirmadas." },
  { key: "INVENTORY_LOW", label: "Stock bajo", description: "Alertas de stock bajo." },
  { key: "INVENTORY_CRITICAL", label: "Stock crítico", description: "Alertas de quiebre o stock crítico." },
  { key: "FOLLOW_UP_OVERDUE", label: "Seguimientos vencidos", description: "Avisos de tareas comerciales vencidas." },
  { key: "TRANSFER_UPDATED", label: "Transferencias", description: "Cambios en transferencias de inventario." },
  { key: "MANUAL", label: "Avisos manuales", description: "Mensajes enviados por un administrador." },
  { key: "SCHEDULED", label: "Avisos programados", description: "Mensajes enviados por una programación." },
  { key: "SCHEDULED_REPORT", label: "Reportes programados", description: "Confirmaciones de reportes ejecutados." },
] as const;

export function isNotificationTypeEnabled(
  preferences: Record<string, boolean> | null | undefined,
  type: string,
) {
  const normalized = type.trim().toUpperCase();
  const direct = preferences?.[normalized];
  if (typeof direct === "boolean") return direct;
  return preferences?.["*"] !== false;
}
