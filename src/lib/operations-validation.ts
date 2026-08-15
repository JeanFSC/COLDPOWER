export const notificationStates = ["UNREAD", "READ", "DISMISSED"] as const;
export type NotificationState = (typeof notificationStates)[number];
export const promotionTypes = ["PERCENTAGE", "AMOUNT", "SPECIAL_PRICE"] as const;
export type PromotionType = (typeof promotionTypes)[number];
export const promotionStatuses = ["DRAFT", "ACTIVE", "INACTIVE", "EXPIRED"] as const;
export type PromotionStatus = (typeof promotionStatuses)[number];
export const promotionPolicies = ["EXCLUSIVE", "STACKABLE", "BEST_VALUE"] as const;
export type PromotionPolicy = (typeof promotionPolicies)[number];
export type PromotionInput = { name: string; description: string | null; type: PromotionType; discountValue: string; startsAt: string; endsAt: string; status: PromotionStatus; bannerAssetId: string | null; productIds: string[]; categoryIds: string[]; priority: number; policy: PromotionPolicy };
function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
export function validatePromotionInput(input: unknown): PromotionInput {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {}; const name = text(value.name, 180); const type = text(value.type, 30); const status = text(value.status, 30) || "DRAFT"; const discount = Number(value.discountValue); const startsAt = text(value.startsAt, 40); const endsAt = text(value.endsAt, 40); const startDate = new Date(startsAt); const endDate = new Date(endsAt);
  const policy = text(value.policy, 30) || "EXCLUSIVE"; const priority = Number(value.priority ?? 0);
  if (!name) throw new Error("La promoción necesita nombre."); if (!(promotionTypes as readonly string[]).includes(type)) throw new Error("Tipo de promoción no válido."); if (!(promotionStatuses as readonly string[]).includes(status)) throw new Error("Estado de promoción no válido."); if (!(promotionPolicies as readonly string[]).includes(policy)) throw new Error("Política de combinación no válida."); if (!Number.isInteger(priority) || priority < 0 || priority > 10000) throw new Error("La prioridad no es válida."); if (!Number.isFinite(discount) || (type === "PERCENTAGE" ? discount < 0 || discount > 100 : discount <= 0) || Math.round(discount * 100) !== discount * 100) throw new Error("El descuento no es válido."); if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) throw new Error("El rango de fechas no es válido.");
  const ids = (inputValue: unknown, field: string) => { if (inputValue === undefined || inputValue === null || inputValue === "") return []; const values = Array.isArray(inputValue) ? inputValue : text(inputValue, 4000).split(","); const result = values.map((item) => typeof item === "string" ? item.trim() : ""); if (result.some((item) => !/^[A-Za-z0-9:_-]{1,160}$/.test(item))) throw new Error(`${field} contiene un ID inválido.`); return [...new Set(result)].slice(0, 500); };
  return { name, description: text(value.description, 1000) || null, type: type as PromotionType, discountValue: discount.toFixed(2), startsAt: startDate.toISOString(), endsAt: endDate.toISOString(), status: status as PromotionStatus, bannerAssetId: text(value.bannerAssetId, 160) || null, productIds: ids(value.productIds, "productIds"), categoryIds: ids(value.categoryIds, "categoryIds"), priority, policy: policy as PromotionPolicy };
}

export function effectivePromotionStatus(promotion: { status: PromotionStatus; startsAt: Date; endsAt: Date }, now = new Date()): PromotionStatus { if (promotion.status === "DRAFT" || promotion.status === "INACTIVE") return promotion.status; if (now < promotion.startsAt) return "DRAFT"; if (now >= promotion.endsAt) return "EXPIRED"; return "ACTIVE"; }
