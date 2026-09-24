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
export const opportunityCurrencies = ["PEN", "USD"] as const;
export type OpportunityCurrency = (typeof opportunityCurrencies)[number];
export const contactActivityTypes = ["CALL", "WHATSAPP", "EMAIL", "MEETING"] as const;

const transitions: Record<OpportunityStage, readonly OpportunityStage[]> = {
  NEW: ["CONTACTED", "QUOTING", "QUOTE_SENT", "LOST", "NO_RESPONSE", "CANCELLED"],
  CONTACTED: ["QUOTING", "QUOTE_SENT", "FOLLOW_UP", "LOST", "NO_RESPONSE", "CANCELLED"],
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

function phone(value: unknown) {
  const raw = clean(value, 40);
  if (!raw) return "";
  return raw.replace(/\D/g, "").slice(0, 20);
}

export function validateCustomerInput(input: Record<string, unknown>, partial = false) {
  const name = clean(input.name, 160);
  const email = clean(input.email, 180).toLowerCase();
  const phoneNumber = phone(input.phone);
  const customerType = input.customerType;
  const status = input.status;
  if (!partial && !name) throw new Error("El nombre del cliente es obligatorio.");
  if (name.length > 160 || email.length > 180 || phoneNumber.length > 40) throw new Error("Los datos del cliente superan el límite permitido.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El correo electrónico no es válido.");
  if (phoneNumber && phoneNumber.length < 7) throw new Error("El teléfono no es válido.");
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
    ...(input.phone !== undefined ? { phone: phoneNumber || null } : {}),
    ...(input.whatsapp !== undefined ? { whatsapp: phone(input.whatsapp) || null } : {}),
    ...(input.email !== undefined ? { email: email || null } : {}),
    ...(input.address !== undefined ? { address: clean(input.address, 240) || null } : {}),
    ...(input.location !== undefined ? { location: clean(input.location, 160) || null } : {}),
    ...(input.contactPreference !== undefined ? { contactPreference: clean(input.contactPreference, 40) || null } : {}),
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
  const currency = input.currency == null || input.currency === "" ? null : String(input.currency).trim().toUpperCase();
  if (currency && !(opportunityCurrencies as readonly string[]).includes(currency)) throw new Error("Moneda inválida.");
  const totalAmount = input.totalAmount == null || input.totalAmount === "" ? null : cleanMoney(input.totalAmount);
  if (totalAmount !== null && !currency) throw new Error("La moneda es obligatoria cuando se indica un monto.");
  const items = validateOpportunityItems(input.items);
  const itemCurrencies = new Set(items.map((item) => item.currency).filter((value): value is OpportunityCurrency => Boolean(value)));
  if (itemCurrencies.size > 1) throw new Error("Una oportunidad no puede mezclar monedas.");
  if (currency && itemCurrencies.size && !itemCurrencies.has(currency as OpportunityCurrency)) throw new Error("Los productos deben usar la misma moneda de la oportunidad.");
  return { customerId, stage: stage as OpportunityStage, origin: origin as OpportunityOrigin, title: clean(input.title, 180) || "Nueva oportunidad", notes: clean(input.notes, 2000) || null, assignedSellerId: clean(input.assignedSellerId, 120) || null, nextAction: clean(input.nextAction, 240) || null, followUpAt, totalAmount, currency: currency as OpportunityCurrency | null, items };
}

function cleanMoney(value: unknown) {
  const result = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d+(?:\.\d{1,2})?$/.test(result)) throw new Error("El monto debe ser un número positivo con hasta dos decimales.");
  const numeric = Number(result);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 999999999999.99) throw new Error("El monto está fuera de rango.");
  return numeric.toFixed(2);
}

export type OpportunityItemInput = { productId: string; quantity: number; unitPrice: string | null; currency: OpportunityCurrency | null };

export function validateOpportunityItems(value: unknown): OpportunityItemInput[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 50) throw new Error("Los productos de la oportunidad no son válidos.");
  const ids = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Los productos de la oportunidad no son válidos.");
    const row = item as Record<string, unknown>;
    const productId = clean(row.productId, 120);
    const quantity = typeof row.quantity === "number" ? row.quantity : Number(row.quantity ?? 0);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) throw new Error("Cada producto necesita una cantidad entera positiva.");
    if (ids.has(productId)) throw new Error("No repitas productos en la oportunidad.");
    ids.add(productId);
    const currency = row.currency == null || row.currency === "" ? null : String(row.currency).trim().toUpperCase();
    if (currency && !(opportunityCurrencies as readonly string[]).includes(currency)) throw new Error("Moneda de producto inválida.");
    return { productId, quantity, unitPrice: row.unitPrice == null || row.unitPrice === "" ? null : cleanMoney(row.unitPrice), currency: currency as OpportunityCurrency | null };
  });
}
