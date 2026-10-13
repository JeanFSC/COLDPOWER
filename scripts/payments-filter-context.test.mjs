import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Payments filter form submits linked scope and resets pagination", () => {
  const source = readFileSync("src/components/admin/PaymentsControlCenter.tsx", "utf8");
  const form = source.slice(source.indexOf('<form'), source.indexOf('</form>'));
  assert.match(form, /\["orderId", "saleId", "customerId", "queue", "pageSize"\]\.map/);
  assert.match(form, /type="hidden" name=\{name\} value=\{value\}/);
  assert.doesNotMatch(form, /name="page"/);
});
