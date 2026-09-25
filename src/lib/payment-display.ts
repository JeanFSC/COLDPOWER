const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  mock: "Pasarela de prueba",
  "development-gateway": "Pasarela de prueba",
};

export function paymentProviderLabel(value: string | null | undefined) {
  if (!value) return "Manual";
  return PAYMENT_PROVIDER_LABELS[value.trim().toLowerCase()] ?? value;
}

export function paymentReferenceLabel(value: string | null | undefined) {
  if (!value) return "N/D";
  return /^mock[_-]/i.test(value.trim()) ? "Referencia de pasarela de prueba" : value;
}

export function paymentStatusLabel(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "CONFIRMED") return "confirmado";
  if (normalized === "APPROVED") return "aprobado";
  if (normalized === "PENDING" || normalized === "UNDER_REVIEW") return "pendiente de revisión";
  if (normalized === "REJECTED" || normalized === "ERROR") return "rechazado";
  if (normalized === "REFUNDED") return "reembolsado";
  if (normalized === "CANCELLED") return "cancelado";
  return value?.trim().toLowerCase() || "registrado";
}
