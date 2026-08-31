import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/components/admin/AdminDashboardView.tsx", "utf8");
const chartSource = fs.readFileSync("src/components/admin/AdminCharts.tsx", "utf8");

test("dashboard executive UI consumes real comparison and humanized DTO fields", () => {
  assert.match(source, /data\.comparisons/);
  assert.match(source, /stage\.stageLabel/);
  assert.match(source, /activity\.actionLabel/);
  assert.match(source, /activity\.entityLabel/);
  assert.match(source, /activity\.actorName/);
  assert.match(source, /row\.roleLabel/);
  assert.match(source, /row\.statusLabel/);
  assert.match(source, /primaryImageUrl/);
});

test("dashboard executive UI has a date selector, greeting and KPI variation affordances", () => {
  assert.match(source, /DashboardRangePicker/);
  assert.match(source, /Bienvenido/);
  assert.match(source, /vs\.\s+per/);
  assert.match(source, /AdminSparkline/);
});

test("dashboard removes technical scaffolding and duplicate completeness metrics", () => {
  assert.doesNotMatch(source, /DashboardReadiness/);
  assert.doesNotMatch(source, /DashboardCompleteness/);
  assert.doesNotMatch(source, /Indicadores comerciales y de inventario/);
  assert.match(source, /Clientes nuevos/);
  assert.match(source, /Categor.*con ventas/);
});

test("dashboard preserves connected export and empty states", () => {
  assert.match(source, /api\/admin\/dashboard\/export/);
  assert.match(source, /No pudimos cargar el dashboard/);
  assert.match(source, /A.*no hay ventas confirmadas/);
  assert.match(source, /Ver toda la actividad/);
});

test("sales chart follows the reference composition with temporal labels and daily grouping", () => {
  assert.match(source, /SalesGranularitySelect/);
  assert.match(source, /labels={salesLabels}/);
  assert.match(source, /formatSalesDateLabel/);
  assert.match(source, /Actual/);
  assert.match(source, /Anterior/);
  assert.match(chartSource, /labels\?: string\[\]/);
  assert.match(chartSource, /formatSalesAxisValue/);
  assert.match(chartSource, /setLineDash/);
});

test("KPI sparklines follow the reference curve and finish", () => {
  assert.match(chartSource, /function drawSmoothSparkline/);
  assert.match(chartSource, /quadraticCurveTo/);
  assert.match(chartSource, /createLinearGradient/);
  assert.match(chartSource, /h-8 w-full/);
  assert.match(source, /const sparklinePattern/);
  assert.match(source, /comparisonSparkline\(.*?, 1\)/);
});

test("superadmin center row follows the reference pipeline and products table", () => {
  assert.match(source, /function superadminStageLabel/);
  assert.match(source, /subtitle="Resumen por etapa"/);
  assert.match(source, /grid-cols-\[minmax\(0,1fr\)_auto_auto\]/);
  assert.match(source, /<span>Ventas<\/span>/);
  assert.match(source, /<span>Ingresos<\/span>/);
  assert.match(source, /Total pipeline/);
});

test("superadmin lower row follows the reference dense activity layout", () => {
  assert.match(source, /function activityTone/);
  assert.match(source, /function activitySectionLabel/);
  assert.match(source, /function activityTimeLabel/);
  assert.match(source, /grid-cols-\[auto_minmax\(0,1fr\)_auto\]/);
  assert.match(source, /title=\{row\.statusLabel\}/);
  assert.match(source, /min-h-\[72px\]/);
  assert.match(source, /CircleOff/);
});

test("bottom KPI rail supports the reference summary without falsifying period metrics", () => {
  assert.match(source, /type DashboardBottomKpis/);
  assert.match(source, /bottomKpis/);
  assert.match(source, /Clientes totales/);
  assert.match(source, /Ventas YTD/);
  assert.match(source, /Órdenes YTD/);
  assert.match(source, /Productos activos/);
  assert.match(source, /xl:grid-cols-6/);
});

test("management and operations dashboards use the reference-specific layouts", () => {
  assert.match(source, /function GerenciaPipelineRows/);
  assert.match(source, /function GerenciaProductsPanel/);
  assert.match(source, /function OperationsKanban/);
  assert.match(source, /function OperationsAwaitingOrders/);
  assert.match(source, /xl:grid-cols-\[1\.9fr_1fr\]/);
  assert.match(source, /Prioritario/);
});
