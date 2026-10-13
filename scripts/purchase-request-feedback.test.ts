import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { apiErrorMessage } from "../src/lib/api-error-message";

test("purchase errors keep the structured API explanation", () => {
  assert.equal(apiErrorMessage({ code: "INVALID", message: "La solicitud ya cambió de estado." }, "Error"), "La solicitud ya cambió de estado.");
  assert.equal(apiErrorMessage("Solicitud no encontrada.", "Error"), "Solicitud no encontrada.");
  for (const value of [null, undefined, {}, { message: 42 }, " "]) assert.equal(apiErrorMessage(value, "Error"), "Error");
});

test("conversion presents product snapshots and uses the SKU as the accessible label", () => {
  const source = readFileSync("src/components/admin/PurchaseRequestActions.tsx", "utf8");
  assert.match(source, /item\.skuSnapshot.*item\.productNameSnapshot/);
  assert.match(source, /aria-label=\{`Costo unitario para \$\{item\.skuSnapshot\}`\}/);
  assert.doesNotMatch(source, /<span>\{item\.productId\}/);
});

test("issuing or cancelling invalidates purchases only after the service succeeds", () => {
  const source = readFileSync("src/app/api/admin/compras/[id]/route.ts", "utf8");
  assert.match(source, /await issuePurchase/);
  assert.match(source, /await cancelPurchase/);
  assert.ok(source.indexOf('revalidatePath("/admin/compras")') > source.indexOf("await cancelPurchase"));
  assert.ok(source.indexOf("return apiSuccess({ purchase })") > source.indexOf('revalidatePath("/admin/compras")'));
});
