import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("el panel admin permite confirmar pagos manuales y el cliente consulta sus pagos", () => {
  const adminPage = read("src/app/admin/pagos/page.tsx") + read("src/components/admin/PaymentsControlCenter.tsx");
  const adminPaymentControl = read("src/components/admin/ManualPaymentControl.tsx");
  assert.ok(adminPage.includes("ManualPaymentControl"));
  assert.ok(adminPaymentControl.includes("/api/admin/pagos/manual"));
  assert.match(adminPage, /PENDING|UNDER_REVIEW/);
  assert.match(adminPaymentControl, /method/);
  assert.match(adminPaymentControl, /reference/);

  const accountPage = read("src/app/cuenta/page.tsx");
  assert.ok(accountPage.includes("/cuenta/pagos"));
  const paymentsPage = read("src/app/cuenta/pagos/page.tsx");
  assert.match(paymentsPage, /listOrdersForUser/);
  assert.match(paymentsPage, /payment/);
  assert.match(paymentsPage, /estado/);
});
