export function quoteRevisionLabel(status: string, registeredVersion: number) {
  if (status === "DRAFT") return `Borrador de v${Math.max(0, registeredVersion) + 1}`;
  return registeredVersion > 0 ? `v${registeredVersion}` : "Sin versión registrada";
}

export function quoteVersionStatusLabel(status: string) {
  const labels: Record<string, string> = { DRAFT: "Borrador", SENT: "Enviada", ACCEPTED: "Aceptada", SUPERSEDED: "Reemplazada" };
  return labels[status] ?? "Estado no clasificado";
}

export function quotePdfVersionNumber(versions: Array<{ id: string; versionNumber: number }>, acceptedVersionId: string | null) {
  return (versions.find(version => version.id === acceptedVersionId) ?? versions[0])?.versionNumber ?? null;
}
