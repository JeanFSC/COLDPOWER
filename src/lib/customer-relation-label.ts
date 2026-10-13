import { pipelineStageLabels } from "./pipeline-contract";
import { orderStatusLabels } from "./order-display";
import { crmActivityLabel } from "./crm-activity-label";

export type CustomerRelationKind = "quotes" | "opportunities" | "sales" | "orders" | "payments" | "activities" | "tasks";
const quoteLabels: Record<string, string> = { DRAFT: "Borrador", SENT: "Enviada", FOLLOW_UP: "Seguimiento", ACCEPTED: "Aceptada", REJECTED: "Rechazada", EXPIRED: "Vencida", CONVERTED: "Convertida", CANCELLED: "Cancelada" };
const saleLabels: Record<string, string> = { DRAFT: "Borrador", CONFIRMED: "Confirmada", CANCELLED: "Cancelada" };
const paymentLabels: Record<string, string> = { PENDING: "Pendiente", UNDER_REVIEW: "En revisión", CONFIRMED: "Confirmado", APPROVED: "Aprobado", REJECTED: "Rechazado", CANCELLED: "Cancelado", REFUNDED: "Reembolsado", REFUND_REQUIRED: "Por reembolsar", ERROR: "Con error" };
const taskLabels: Record<string, string> = { PENDING: "Pendiente", COMPLETED: "Completada", CANCELLED: "Cancelada", OVERDUE: "Vencida" };

export function customerRelationLabel(kind: CustomerRelationKind, value: string) {
  if (kind === "activities") return crmActivityLabel(value);
  if (kind === "tasks") return taskLabels[value] ?? "Estado desconocido";
  const maps: Record<Exclude<CustomerRelationKind, "activities" | "tasks">, Record<string, string>> = {
    quotes: quoteLabels, opportunities: pipelineStageLabels, sales: saleLabels,
    orders: orderStatusLabels, payments: paymentLabels,
  };
  return maps[kind][value] ?? value;
}
