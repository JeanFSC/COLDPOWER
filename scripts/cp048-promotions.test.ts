import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { effectivePromotionStatus, validatePromotionInput } from "@/lib/operations-validation";
import { applyPromotionToUnitPrice } from "@/lib/promotion-service";
import { can } from "@/lib/roles";

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), "utf8");
const valid = { name: "Campaña QA", type: "PERCENTAGE", discountValue: 15, startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2026-12-31T23:59:59.000Z", status: "DRAFT", policy: "BEST_VALUE", priority: 20 };

test("promociones validan fecha, porcentaje, prioridad y política", () => {
  const input = validatePromotionInput(valid);
  assert.equal(input.discountValue, "15.00");
  assert.equal(input.policy, "BEST_VALUE");
  assert.throws(() => validatePromotionInput({ ...valid, discountValue: 101 }));
  assert.throws(() => validatePromotionInput({ ...valid, endsAt: "2025-01-01T00:00:00.000Z" }));
  assert.throws(() => validatePromotionInput({ ...valid, priority: -1 }));
});

test("promociones resuelven vigencia y no alteran el precio base", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");
  assert.equal(effectivePromotionStatus({ status: "ACTIVE", startsAt: new Date("2026-01-01"), endsAt: new Date("2026-05-31") }, now), "EXPIRED");
  assert.deepEqual(applyPromotionToUnitPrice({ id: "p", type: "PERCENTAGE", discountValue: "15.00" }, "100.00"), { baseUnitPrice: "100.00", discountAmount: "15.00", finalUnitPrice: "85.00" });
  assert.deepEqual(applyPromotionToUnitPrice({ id: "p", type: "AMOUNT", discountValue: "120.00" }, "100.00"), { baseUnitPrice: "100.00", discountAmount: "100.00", finalUnitPrice: "0.00" });
});

test("promociones tienen asociaciones transaccionales, preview, aprobación, idempotencia y exportación", () => {
  const create = read("src/app/api/admin/promociones/route.ts");
  const update = read("src/app/api/admin/promociones/[id]/route.ts");
  const service = read("src/lib/promotion-service.ts");
  assert.match(create, /transaction/);
  assert.match(create, /promotionProducts/);
  assert.match(create, /promotionCategories/);
  assert.match(update, /validatePromotionAssociations/);
  assert.match(read("src/app/api/admin/promociones/[id]/preview/route.ts"), /applyPromotionToUnitPrice/);
  assert.match(read("src/app/api/admin/promociones/[id]/approval/route.ts"), /pricing\.discount\.approve/);
  assert.match(read("src/app/api/admin/promociones/export/route.ts"), /promotions\.export/);
  assert.match(service, /onConflictDoNothing/);
  assert.match(service, /promotions\.applied/);
  const repository = read("src/lib/promotion-repository.ts");
  assert.match(repository, /effectivePromotionStatus/);
  assert.match(repository, /promotions\.endsAt/);
  assert.match(repository, /promotions\.startsAt/);
});

test("RBAC separa administrar promociones, aprobar descuentos y exportar", () => {
  assert.equal(can("customer", "promotions.manage"), false);
  assert.equal(can("SUPERADMIN", "promotions.manage"), true);
  assert.equal(can("SUPERADMIN", "pricing.discount.approve"), true);
  assert.equal(can("GERENCIA", "promotions.export"), true);
});
