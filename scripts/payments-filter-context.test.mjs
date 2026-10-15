import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Order payment tab keeps the selected order when managing payments", () => {
  const source = readFileSync("src/components/admin/OrdersControlCenter.tsx", "utf8");
  const linkEnd = source.indexOf("Gestionar pago →");
  const link = source.slice(source.lastIndexOf("<Link", linkEnd), linkEnd);
  assert.ok(linkEnd > 0);
  assert.ok(link.includes("/admin/pagos?orderId=${encodeURIComponent(String(detail.order.id))}"));
});

test("Payments filter form submits linked scope and resets pagination", () => {
  const source = readFileSync("src/components/admin/PaymentsControlCenter.tsx", "utf8");
  const form = source.slice(source.indexOf('<form'), source.indexOf('</form>'));
  assert.match(form, /\["orderId", "saleId", "customerId", "queue", "pageSize"\]\.map/);
  assert.match(form, /type="hidden" name=\{name\} value=\{value\}/);
  assert.doesNotMatch(form, /name="page"/);
});
