export function userStatusLabel(status: string) {
  const labels: Record<string, string> = { ACTIVE: "Activo", INACTIVE: "Inactivo", SUSPENDED: "Suspendido", INVITED: "Invitado" };
  return Object.hasOwn(labels, status) ? labels[status] : "Estado desconocido";
}

export function userSyncLabel(status: string) {
  const labels: Record<string, string> = { SYNCED: "Sincronizado", PENDING: "Pendiente de sincronización", DELETED: "Eliminado en Clerk" };
  return Object.hasOwn(labels, status) ? labels[status] : "Sincronización desconocida";
}
