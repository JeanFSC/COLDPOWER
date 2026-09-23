import type { Permission } from "@/lib/roles";

export const notificationTargetPermissions: Record<string, Permission> = {
  CONTACT_SUBMITTED: "crm.view",
  QUOTE_CREATED: "quotes.view",
  LEAD_CREATED: "crm.view",
  PAYMENT_APPROVED: "payments.view",
  PAYMENT_FAILED: "payments.view",
  ORDER_CREATED: "orders.view",
  ORDER_READY: "orders.view",
  SALE_CREATED: "sales.view",
  INVENTORY_LOW: "inventory.view",
  INVENTORY_CRITICAL: "inventory.view",
  FOLLOW_UP_OVERDUE: "crm.view",
  TRANSFER_UPDATED: "inventory.transfer",
};

export function notificationPermissionForType(type: string): Permission {
  return notificationTargetPermissions[type] ?? "operations.view";
}
