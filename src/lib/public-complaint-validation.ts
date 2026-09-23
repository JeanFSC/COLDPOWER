export type PublicComplaintInput = {
  name: string;
  documentType: "DNI" | "CE" | "RUC" | "PASAPORTE";
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
  complaintType: "RECLAMO" | "QUEJA";
  detail: string;
  productReference: string;
  requestId: string;
  consent: boolean;
};

const limits = {
  name: 160,
  documentNumber: 32,
  email: 180,
  phone: 32,
  address: 300,
  detail: 5000,
  productReference: 240,
  requestId: 80,
} as const;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function validatePublicComplaintPayload(input: Record<string, unknown>) {
  const data = {
    name: clean(input.name, limits.name),
    documentType: clean(input.documentType, 24) as PublicComplaintInput["documentType"],
    documentNumber: clean(input.documentNumber, limits.documentNumber),
    email: clean(input.email, limits.email).toLowerCase(),
    phone: clean(input.phone, limits.phone),
    address: clean(input.address, limits.address),
    complaintType: clean(input.complaintType, 16) as PublicComplaintInput["complaintType"],
    detail: clean(input.detail, limits.detail),
    productReference: clean(input.productReference, limits.productReference),
    requestId: clean(input.requestId, limits.requestId),
    consent: input.consent === true || input.consent === "true",
  } satisfies PublicComplaintInput;
  const errors: Record<string, string> = {};
  if (data.name.length < 2) errors.name = "Indica tu nombre completo.";
  if (!(["DNI", "CE", "RUC", "PASAPORTE"] as string[]).includes(data.documentType)) errors.documentType = "Selecciona un tipo de documento.";
  if (data.documentNumber.length < 5) errors.documentNumber = "Indica tu número de documento.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Indica un correo válido.";
  if (data.phone.replace(/\D/g, "").length < 7) errors.phone = "Indica un teléfono válido.";
  if (data.address.length < 5) errors.address = "Indica tu dirección.";
  if (!(["RECLAMO", "QUEJA"] as string[]).includes(data.complaintType)) errors.complaintType = "Selecciona reclamo o queja.";
  if (data.detail.length < 10) errors.detail = "Describe el hecho y tu pedido.";
  if (!data.requestId) errors.requestId = "Falta el identificador de la solicitud.";
  if (!data.consent) errors.consent = "Debes aceptar el uso de la información.";
  return Object.keys(errors).length ? { ok: false as const, data: null, errors } : { ok: true as const, data, errors: {} };
}
