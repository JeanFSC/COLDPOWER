export type PublicContactField = "name" | "company" | "phone" | "email" | "message" | "consent" | "requestId";

export type PublicContactPayload = {
  name: string;
  company: string;
  phone: string;
  email: string;
  message: string;
  consent: boolean;
  requestId: string;
};

export type PublicContactValidationResult =
  | { ok: true; data: PublicContactPayload; errors: Record<string, never> }
  | { ok: false; data: null; errors: Partial<Record<PublicContactField, string>> };

export const publicContactMaxLengths = {
  name: 100,
  company: 120,
  phone: 32,
  email: 160,
  message: 2000,
  requestId: 120,
} as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePublicContactPayload(input: Record<string, unknown>): PublicContactValidationResult {
  const data: PublicContactPayload = {
    name: sanitize(input.name, publicContactMaxLengths.name),
    company: sanitize(input.company, publicContactMaxLengths.company),
    phone: normalizePhone(input.phone),
    email: sanitize(input.email, publicContactMaxLengths.email).toLowerCase(),
    message: sanitize(input.message, publicContactMaxLengths.message),
    consent: input.consent === true || input.consent === "true" || input.consent === "on",
    requestId: sanitize(input.requestId, publicContactMaxLengths.requestId),
  };
  const errors: Partial<Record<PublicContactField, string>> = {};
  if (data.name.length < 2) errors.name = "Ingresa tu nombre completo.";
  if (data.phone.replace(/\D/g, "").length < 7) errors.phone = "Ingresa un teléfono válido.";
  if (!data.email || !emailPattern.test(data.email)) errors.email = "Ingresa un correo válido.";
  if (data.message.length < 10) errors.message = "Cuéntanos un poco más sobre tu requerimiento.";
  if (!data.requestId || !/^[A-Za-z0-9_-]{12,120}$/.test(data.requestId)) errors.requestId = "No se pudo identificar la solicitud.";
  if (!data.consent) errors.consent = "Acepta el uso de tus datos para atender la consulta.";
  return Object.keys(errors).length ? { ok: false, data: null, errors } : { ok: true, data, errors: {} };
}

export function sanitize(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

export function normalizePhone(value: unknown) {
  return typeof value === "string" ? value.replace(/[^\d+()\-\s]/g, "").replace(/\s+/g, " ").trim().slice(0, publicContactMaxLengths.phone) : "";
}
