import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../src/app/admin/reportes/page.tsx", import.meta.url), "utf8");
const view = readFileSync(new URL("../src/components/admin/AdminReportsStitch.tsx", import.meta.url), "utf8");

test("Reportes: ventas del período usa el mismo rango que la comparación", () => {
  assert.match(page, /label: "Ventas del período",\s*value: data \? formatMoney\(data.salesRange.total, data.currency\)/);
  assert.match(view, /const delta = item.label === "Ventas del período"\s*\? salesDelta/);
  assert.doesNotMatch(view, /item.label.startsWith\("Ventas"\)/);
});

test("Reportes: pedidos activos y ventas hoy no muestran tendencias de otro alcance", () => {
  assert.match(page, /Estado actual · sin filtro de fecha/);
  assert.match(view, /item.label === "Ventas hoy" \|\| item.label === "Pedidos activos" \? null : <MetricSparkline/);
  assert.doesNotMatch(view, /const orderTrend/);
});

test("Reportes: la minigráfica no convierte márgenes desconocidos en cero", () => {
  assert.doesNotMatch(view, /row.margin \?\? 0/);
  assert.match(view, /row.total \* row.margin : null/);
  assert.match(view, /const previous = series\[index - 1\]/);
  assert.match(view, /Number.isFinite\(previous\) \? "L" : "M"/);
});
