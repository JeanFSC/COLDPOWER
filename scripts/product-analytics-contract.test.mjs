import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const service = fs.readFileSync(path.join(root, "src/lib/product-analytics.ts"), "utf8");
const page = fs.readFileSync(path.join(root, "src/app/admin/catalogo/[id]/page.tsx"), "utf8");
for (const field of ["inventory", "reserved", "available", "salesToday", "sales7Days", "sales30Days", "quotes", "convertedQuotes", "opportunities", "conversion", "currentPrice", "lastSoldPrice", "margin", "rotation"]) assert.match(service, new RegExp(field), `analytics must include ${field}`);
assert.match(service, /convertedQuotes/);
assert.match(service, /quoteConversionTotal/);
assert.match(page, /Conversi/);
assert.match(page, /product-analytics/);
assert.match(page, /An[aá]lisis del producto/);
console.log("Product analytics contract: PASS");
