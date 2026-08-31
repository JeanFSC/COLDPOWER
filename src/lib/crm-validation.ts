export const customerTypes = ["PERSON", "COMPANY", "CONSUMIDOR", "TECNICO", "EMPRESA", "DISTRIBUIDOR", "MAYORISTA"] as const;
export type CustomerType = (typeof customerTypes)[number];
export const customerStatuses = ["ACTIVE", "INACTIVE", "PROSPECT"] as const;
export type CustomerStatus = (typeof customerStatuses)[number];
export const opportunityStages = ["NEW", "CONTACTED", "QUOTING", "QUOTE_SENT", "FOLLOW_UP", "NEGOTIATION", "ACCEPTED", "SALE", "PAYMENT_PENDING", "PAID", "PREPARING", "DELIVERED", "CLOSED", "LOST", "CANCELLED", "NO_RESPONSE"] as const;
export type OpportunityStage = (typeof opportunityStages)[number];
export const opportunityOrigins = ["WEB", "WHATSAPP", "TELEFONO", "LOCAL", "REFERIDO", "CLIENTE_RECURRENTE", "OTRO"] as const;
export type OpportunityOrigin = (typeof opportunityOrigins)[number];
export const activityTypes = ["CALL", "WHATSAPP", "EMAIL", "MEETING", "TASK", "NOTE"] as const;
export type ActivityType = (typeof activityTypes)[number];
export const taskStatuses = ["PENDING", "COMPLETED", "OVERDUE", "CANCELLED"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

const transitions: Record<OpportunityStage, readonly OpportunityStage[]> = {
  NEW: ["CONTACTED", "QUOTING", "LOST", "NO_RESPONSE", "CANCELLED"],
  CONTACTED: ["QUOTING", "FOLLOW_UP", "LOST", "NO_RESPONSE", "CANCELLED"],
  QUOTING: ["QUOTE_SENT", "FOLLOW_UP", "NEGOTIATION", "LOST", "CANCELLED"],
  QUOTE_SENT: ["FOLLOW_UP", "NEGOTIATION", "ACCEPTED", "LOST", "NO_RESPONSE", "CANCELLED"],
  FOLLOW_UP: ["NEGOTIATION", "ACCEPTED", "QUOTE_SENT", "LOST", "NO_RESPONSE", "CANCELLED"],
  NEGOTIATION: ["ACCEPTED", "SALE", "LOST", "CANCELLED"],
  ACCEPTED: ["SALE", "PAYMENT_PENDING", "CANCELLED"],
  SALE: ["PAYMENT_PENDING", "PAID", "PREPARING", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "DELIVERED", "CANCELLED"],
  PREPARING: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["CLOSED"],
  CLOSED: [],
  LOST: [],
  CANCELLED: [],
  NO_RESPONSE: ["CONTACTED", "FOLLOW_UP", "LOST", "CANCELLED"],
};

export function canTransitionOpportunity(from: OpportunityStage, to: OpportunityStage) {
  return from === to || transitions[from]?.includes(to) === true;
}

export function assertOpportunityTransition(from: OpportunityStage, to: OpportunityStage) {
  if (!canTransitionOpportunity(from, to)) throw new Error(`Transición no permitida: ${from} → ${to}.`);
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function validateCustomerInput(input: Record<string, unknown>, partial = false) {
  const name = clean(input.name, 160);
  const email = clean(input.email, 180).toLowerCase();
  const phone = clean(input.phone, 40);
  const customerType = input.customerType;
  const status = input.status;
  if (!partial && !name) throw new Error("El nombre del cliente es obligatorio.");
  if (name.length > 160 || email.length > 180 || phone.length > 40) throw new Error("Los datos del cliente superan el límite permitido.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El correo electrónico no es válido.");
  if (phone && phone.replace(/\D/g, "").length < 7) throw new Error("El teléfono no es válido.");
  if (customerType !== undefined && !(customerTypes as readonly string[]).includes(String(customerType))) throw new Error("Tipo de cliente inválido.");
  if (status !== undefined && !(customerStatuses as readonly string[]).includes(String(status))) throw new Error("Estado de cliente inválido.");
  const normalizedType = customerType === undefined ? undefined : String(customerType);
  const ruc = clean(input.ruc, 40);
  if (ruc && !/^\d{11}$/.test(ruc)) throw new Error("El RUC debe contener 11 dígitos.");
  if (!partial && (normalizedType === "COMPANY" || normalizedType === "EMPRESA") && !ruc) throw new Error("El RUC es obligatorio para empresas.");
  return {
    ...(partial || name ? { name } : {}),
    ...(input.legalName !== undefined ? { legalName: clean(input.legalName, 180) || null } : {}),
    ...(input.documentNumber !== undefined ? { documentNumber: clean(input.documentNumber, 40) || null } : {}),
    ...(input.ruc !== undefined ? { ruc: ruc || null } : {}),
    ...(input.phone !== undefined ? { phone: phone || null } : {}),
    ...(input.whatsapp !== undefined ? { whatsapp: clean(input.whatsapp, 40) || null } : {}),
    ...(input.email !== undefined ? { email: email || null } : {}),
    ...(input.address !== undefined ? { address: clean(input.address, 240) || null } : {}),
    ...(input.location !== undefined ? { location: clean(input.location, 160) || null } : {}),
    ...(input.customerType !== undefined ? { customerType: String(input.customerType) as CustomerType } : {}),
    ...(input.status !== undefined ? { status: String(input.status) as CustomerStatus } : {}),
    ...(input.assignedSellerId !== undefined ? { assignedSellerId: clean(input.assignedSellerId, 120) || null } : {}),
    ...(input.userId !== undefined ? { userId: clean(input.userId, 160) || null } : {}),
    ...(input.notes !== undefined ? { notes: clean(input.notes, 2000) || null } : {}),
  };
}

export function validateOpportunityInput(input: Record<string, unknown>) {
  const customerId = clean(input.customerId, 120);
  const stage = String(input.stage ?? "NEW");
  const origin = String(input.origin ?? "WEB");
  if (!customerId) throw new Error("La oportunidad necesita un cliente.");
  if (!(opportunityStages as readonly string[]).includes(stage)) throw new Error("Etapa inválida.");
  if (!(opportunityOrigins as readonly string[]).includes(origin)) throw new Error("Origen inválido.");
  const followUpAt = input.followUpAt ? new Date(String(input.followUpAt)) : null;
  if (followUpAt && Number.isNaN(followUpAt.getTime())) throw new Error("La fecha de seguimiento no es válida.");
  return { customerId, stage: stage as OpportunityStage, origin: origin as OpportunityOrigin, title: clean(input.title, 180) || "Nueva oportunidad", notes: clean(input.notes, 2000) || null, assignedSellerId: clean(input.assignedSellerId, 120) || null, nextAction: clean(input.nextAction, 240) || null, followUpAt };
}
