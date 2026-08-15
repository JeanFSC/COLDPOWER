import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const roles = read("src/lib/roles.ts");
const pricingPage = read("src/app/admin/precios/page.tsx");
const pricingUi = read("src/components/admin/PricingOperations.tsx");
const pricingApi = read("src/app/api/admin/precios/route.ts");
const historyApi = read("src/app/api/admin/precios/historial/route.ts");

assert.match(roles, /OPERACIONES_VENTAS[\s\S]*?businessOperations/);
assert.doesNotMatch(roles.match(/const businessOperations = ([\s\S]*?);/)?.[1] ?? "", /pricing\.cost\.view|pricing\.margin\.view/);
assert.match(pricingPage, /can\(|pricing\.cost\.view/);
assert.match(pricingUi, /COST/);
assert.match(pricingApi, /priceType.*COST|COST.*pricing\.cost\.view/);
assert.match(historyApi, /pricing\.cost\.view|includeCost/);
console.log("CP-028 pricing safety contract: PASS");
