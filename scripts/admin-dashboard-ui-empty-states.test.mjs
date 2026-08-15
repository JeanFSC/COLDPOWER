import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/components/admin/AdminDashboardView.tsx", "utf8");

test("dashboard exposes connected export and period controls with truthful next steps", () => {
  assert.match(source, /api\/admin\/dashboard\/export/);
  assert.match(source, /name="range"/);
  assert.match(source, /Descarga el CSV generado/);
  assert.match(source, /No pudimos cargar el dashboard/);
  assert.match(source, /No mostramos métricas de respaldo/);
  assert.match(source, /Estado del panel/);
  assert.match(source, /Aún no hay actividad comercial confirmada en este período/);
  assert.match(source, /href="\/admin\/cotizaciones"/);
  assert.match(source, /href="\/admin\/inventario"/);
});
