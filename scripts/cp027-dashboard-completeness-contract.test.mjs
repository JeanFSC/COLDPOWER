import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("dashboard operativo expone mÃƒÂ©tricas comerciales y de inventario completas", () => {
  const service = read("src/lib/operations-dashboard.ts");
  for (const field of ["conversion", "overdueFollowUps", "noStock", "noMovement", "transfers", "topProducts", "topCustomers", "topSellers", "channels", "newCustomers", "returningCustomers", "productsSold", "unitsSold", "margin"]) assert.match(service, new RegExp(field));
  const page = read("src/app/admin/page.tsx") + read("src/components/admin/AdminDashboardView.tsx");
  for (const label of [String.fromCharCode(67,111,110,118,101,114,115,105,243,110), "Seguimientos vencidos", "Sin stock", "Sin movimiento", "Transferencias", "Top productos", "Top clientes", "Top vendedores", "Canales", "Clientes nuevos", "Clientes recurrentes", "Productos vendidos", "Unidades vendidas", "Margen"]) assert.match(page, new RegExp(label));
});


