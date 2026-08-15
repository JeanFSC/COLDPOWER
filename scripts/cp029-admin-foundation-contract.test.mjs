import assert from "node:assert/strict";
import fs from "node:fs";

const views = fs.readFileSync("src/components/admin/AdminCategoryViews.tsx", "utf8");
const shell = fs.readFileSync("src/components/admin/AdminShell.tsx", "utf8");
const operationsRoute = fs.readFileSync("src/app/admin/operaciones/page.tsx", "utf8");
const dashboardView = fs.readFileSync("src/components/admin/AdminDashboardView.tsx", "utf8");
const account = fs.readFileSync("src/app/cuenta/page.tsx", "utf8");

assert.doesNotMatch(views, /25 may\.?\s*-\s*24 jun\.?\s*2024/i);
assert.doesNotMatch(views, /190\.12\.45\.23/);
assert.doesNotMatch(views, /\[156,\s*28,\s*42,\s*71,\s*15\]/);
assert.doesNotMatch(views, /Transferencia bancaria.*Deposito en cuenta.*Tarjeta de credito/i);
assert.match(views, /aria-label|aria-labelledby/);
assert.match(shell, /sticky|lg:sticky/);
assert.doesNotMatch(shell, />12<|2024 ColdPower/);
assert.match(shell, /router\.push/);
assert.match(operationsRoute, /view="operations"/);
assert.match(dashboardView, /view === "operations"/);
assert.match(account, /isStaffRole/);
assert.match(account, /Acceso administrativo/);
assert.match(account, /Abrir dashboard/);
assert.match(account, /\/admin\/dashboard/);

console.log("cp029-admin-foundation-contract: passed");
