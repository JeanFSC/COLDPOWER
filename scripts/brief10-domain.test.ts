import assert from "node:assert/strict";
import test from "node:test";
import { formatLimaDateTimeLocal, parseLimaDateTimeLocal } from "@/lib/lima-datetime";
import { leadIdentityKeys } from "@/lib/crm-service";
import { assertCustomerMergeable } from "@/lib/customer-operations-service";
import { canActOnOperationsWorkItem } from "@/lib/operations-work-items-service";
import { calculatePromotionalUnitPrice } from "@/lib/promotion-pricing";

test("brief 10: la identidad de un lead prioriza usuario, documento, teléfono y correo normalizados", () => {
  assert.deepEqual(
    leadIdentityKeys({ userId: " user-1 ", documentNumber: " 123-45 ", phone: "+51 (999) 111", email: " Jean@Example.COM " }),
    ["user:user-1", "document:12345", "phone:51999111", "email:jean@example.com"],
  );
});

test("brief 10: las fusiones no crean cadenas y conservan el vínculo de usuario", () => {
  assert.doesNotThrow(() => assertCustomerMergeable({ canonicalCustomerId: null, userId: null }, { canonicalCustomerId: null, userId: "user-2" }));
  assert.throws(() => assertCustomerMergeable({ canonicalCustomerId: "customer-root", userId: null }, { canonicalCustomerId: null, userId: null }), (error) => (error as { code?: string }).code === "CUSTOMER_MERGE_CHAIN");
  assert.throws(() => assertCustomerMergeable({ canonicalCustomerId: null, userId: "user-1" }, { canonicalCustomerId: null, userId: "user-2" }), (error) => (error as { code?: string }).code === "CUSTOMER_MERGE_USER_CONFLICT");
});

test("brief 10: los datetime-local se muestran y persisten en hora Lima", () => {
  const value = new Date("2026-09-23T17:30:00.000Z");
  assert.equal(formatLimaDateTimeLocal(value), "2026-09-23T12:30");
  assert.equal(parseLimaDateTimeLocal("2026-09-23T12:30").toISOString(), value.toISOString());
});

test("brief 10: operaciones limita tomar una tarea al equipo autorizado", () => {
  assert.equal(canActOnOperationsWorkItem("ALMACEN", "QUOTE", "ALMACEN"), false);
  assert.equal(canActOnOperationsWorkItem("VENTAS", "QUOTE", "VENTAS"), true);
  assert.equal(canActOnOperationsWorkItem("ALMACEN", "INVENTORY", "ALMACEN"), true);
});

test("brief 10: el precio promocional compartido es puro y nunca aumenta el precio base", () => {
  assert.deepEqual(
    calculatePromotionalUnitPrice({ id: "promo-1", type: "PERCENTAGE", discountValue: "15.00" }, "100.00"),
    { baseUnitPrice: "100.00", discountAmount: "15.00", finalUnitPrice: "85.00" },
  );
  assert.deepEqual(
    calculatePromotionalUnitPrice({ id: "promo-2", type: "SPECIAL_PRICE", discountValue: "120.00" }, "100.00"),
    { baseUnitPrice: "100.00", discountAmount: "0.00", finalUnitPrice: "100.00" },
  );
});
