import type { NotificationEventContext } from "./notification-rules-service";

const aliases: Record<string, string> = {
  PRODUCT_OUT_OF_STOCK: "INVENTORY_CRITICAL",
  STOCK_MINIMUM: "INVENTORY_LOW",
  TRANSFER_APPROVAL_PENDING: "TRANSFER_UPDATED",
};

export function normalizeNotificationEventType(value: string) {
  const type = value.trim().toUpperCase();
  return (Object.hasOwn(aliases, type) ? aliases[type] : type).slice(0, 80);
}

export function notificationRuleEventTypes(value: string) {
  const type = normalizeNotificationEventType(value);
  return [type, ...Object.keys(aliases).filter((alias) => aliases[alias] === type)];
}

/** Expose only the domain actually emitted by the notification producer. */
export function notificationEventContext(eventType: string, metadata: Record<string, unknown> | null): NotificationEventContext {
  const type = normalizeNotificationEventType(eventType);
  return {
    eventType: type,
    entity: metadata,
    ...(type === "INVENTORY_CRITICAL" || type === "INVENTORY_LOW" ? { inventory: metadata } : {}),
    ...(type.startsWith("PAYMENT_") ? { payment: metadata } : {}),
    ...(type.startsWith("ORDER_") ? { order: metadata } : {}),
    ...(type === "QUOTE_CREATED" ? { quote: metadata } : {}),
    assigneeId: typeof metadata?.assigneeId === "string" ? metadata.assigneeId : null,
  };
}

export function notificationEventEntityId(context: NotificationEventContext) {
  const entity = context.entity;
  const inventoryProductId = context.inventory?.productId;
  const inventoryLocationId = context.inventory?.locationId;
  if (inventoryProductId != null && inventoryLocationId != null) {
    return `${String(inventoryProductId)}:${String(inventoryLocationId)}`;
  }
  for (const key of ["id", "code", "orderId", "quoteId", "paymentId", "transferId", "saleId", "opportunityId", "followUpId", "leadId"]) {
    const value = entity?.[key];
    if (value != null && String(value).trim()) return String(value);
  }
  return context.eventType;
}
