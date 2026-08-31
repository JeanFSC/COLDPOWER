import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, discountRules } from "@/db/schema";
import { validateDiscountInput } from "@/lib/pricing-validation";
import { validateDiscountRuleStatus, type PricingActor } from "@/lib/pricing-service";
import { can } from "@/lib/roles";

type DiscountInput = { name?: unknown; maxPercentage?: unknown; approvalAbovePercentage?: unknown; status?: unknown; validFrom?: unknown; validUntil?: unknown; reason?: unknown };

function assertDiscountPermission(actor: PricingActor) {
  if (!can(actor.role, "pricing.discount.manage")) throw new Error("DISCOUNT_FORBIDDEN");
}

function parseDates(input: DiscountInput) {
  const validFrom = input.validFrom === undefined || input.validFrom === "" || input.validFrom === null ? null : new Date(String(input.validFrom));
  const validUntil = input.validUntil === undefined || input.validUntil === "" || input.validUntil === null ? null : new Date(String(input.validUntil));
  if ((validFrom && Number.isNaN(validFrom.getTime())) || (validUntil && Number.isNaN(validUntil.getTime())) || (validFrom && validUntil && validUntil <= validFrom)) throw new Error("DISCOUNT_INVALID_WINDOW");
  return { validFrom, validUntil };
}

function reason(input: DiscountInput) {
  const value = typeof input.reason === "string" ? input.reason.trim().slice(0, 240) : "";
  if (!value) throw new Error("DISCOUNT_REASON_REQUIRED");
  return value;
}

export async function createDiscountRule(input: DiscountInput, actor: PricingActor) {
  assertDiscountPermission(actor);
  const values = validateDiscountInput(input);
  const dates = parseDates(input);
  const note = reason(input);
  return getDb().transaction(async (tx) => {
    const [created] = await tx.insert(discountRules).values({ id: `discount-rule-${crypto.randomUUID()}`, ...values, status: "ACTIVE", validFrom: dates.validFrom, validUntil: dates.validUntil, createdBy: actor.userId }).returning();
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "pricing.discount_rule_created", entityType: "discount_rule", entityId: created.id, before: null, after: created, metadata: { reason: note } });
    return { rule: created, idempotent: false };
  });
}

export async function updateDiscountRule(id: string, input: DiscountInput, actor: PricingActor) {
  assertDiscountPermission(actor);
  const values = validateDiscountInput(input);
  const dates = parseDates(input);
  const note = reason(input);
  const requestedStatus = input.status === undefined ? undefined : validateDiscountRuleStatus(input.status);
  return getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(discountRules).where(eq(discountRules.id, id)).limit(1);
    if (!before) throw new Error("DISCOUNT_NOT_FOUND");
    const status = requestedStatus ?? before.status;
    if (before.name === values.name && String(before.maxPercentage) === values.maxPercentage && String(before.approvalAbovePercentage) === values.approvalAbovePercentage && before.status === status && (before.validFrom?.getTime() ?? null) === (dates.validFrom?.getTime() ?? null) && (before.validUntil?.getTime() ?? null) === (dates.validUntil?.getTime() ?? null)) return { rule: before, idempotent: true };
    const [after] = await tx.update(discountRules).set({ ...values, status, validFrom: dates.validFrom, validUntil: dates.validUntil, updatedAt: new Date() }).where(eq(discountRules.id, id)).returning();
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "pricing.discount_rule_updated", entityType: "discount_rule", entityId: id, before, after, metadata: { reason: note } });
    return { rule: after, idempotent: false };
  });
}

export async function setDiscountRuleStatus(id: string, statusInput: unknown, reasonInput: unknown, actor: PricingActor) {
  assertDiscountPermission(actor);
  const status = validateDiscountRuleStatus(statusInput);
  const note = reason({ reason: reasonInput });
  return getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(discountRules).where(eq(discountRules.id, id)).limit(1);
    if (!before) throw new Error("DISCOUNT_NOT_FOUND");
    if (before.status === status) return { rule: before, idempotent: true };
    const [after] = await tx.update(discountRules).set({ status, updatedAt: new Date() }).where(and(eq(discountRules.id, id), eq(discountRules.status, before.status))).returning();
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "pricing.discount_rule_status_changed", entityType: "discount_rule", entityId: id, before, after, metadata: { reason: note } });
    return { rule: after, idempotent: false };
  });
}
