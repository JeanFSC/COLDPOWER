import { formatAdminMoney } from "@/lib/admin-money-display";

export function formatPurchaseMoney(value: number | string, currency: string) {
  return formatAdminMoney(value, currency);
}
