import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const account = fs.readFileSync(path.join(root, "src/app/cuenta/page.tsx"), "utf8");
const orders = fs.readFileSync(path.join(root, "src/app/cuenta/pedidos/page.tsx"), "utf8");
const service = fs.readFileSync(path.join(root, "src/lib/customer-history.ts"), "utf8");
assert.match(account, /Historial/);
assert.match(account, /Productos comprados/);
assert.match(account, /Repetir pedido/);
assert.match(orders, /cuenta\/historial/);
assert.match(orders, /Repetir pedido/);
assert.match(service, /listPurchasedProductsForUser/);
const purchaseHistory = service.split("export async function listOrderItemsForUser")[0];
assert.match(purchaseHistory, /innerJoin\(products,\s*eq\(orderItems\.productId, products\.id\)\)/);
console.log("Customer history contract: PASS");
