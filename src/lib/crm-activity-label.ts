const labels: Record<string, string> = {
  CALL: "Llamada",
  WHATSAPP: "WhatsApp",
  EMAIL: "Correo",
  MEETING: "Reunión",
  TASK: "Tarea",
  NOTE: "Nota",
  STAGE: "Cambio de etapa",
};

export function crmActivityLabel(type: string) {
  return labels[type] ?? "Actividad";
}

export function crmFollowupStatusLabel(status: string) {
  const statuses: Record<string, string> = {
    PENDING: "Pendiente",
    COMPLETED: "Completado",
    CANCELLED: "Cancelado",
    OVERDUE: "Vencido",
  };
  return statuses[status] ?? "Estado desconocido";
}
