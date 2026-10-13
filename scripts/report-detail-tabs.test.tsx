import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportDetailTabs } from "../src/components/admin/ReportDetailTabs";
import { AdminReportsStitch } from "../src/components/admin/AdminReportsStitch";

test("Report failure hides summary panels instead of showing zero counts", () => {
  const html = renderToStaticMarkup(<AdminReportsStitch data={null} metrics={[]} schedules={[]} reportFilters={{}} currentUserId="qa" canViewCatalog={false} executionConfigured={false} error="No se pudo cargar el reporte" />);
  assert.ok(html.includes("Reporte no disponible"));
  for (const section of ["Resumen de inventario", "Resumen de clientes"]) assert.equal(html.includes(section), false);
  assert.doesNotMatch(html, /<dd[^>]*>0<\/dd>/);
});

test("Report tabs expose three associated panels and one initial keyboard stop", () => {
  const html = renderToStaticMarkup(<ReportDetailTabs inventory={<p>Stock actual</p>} customers={<p>Cartera</p>}><p>Ventas por fecha</p></ReportDetailTabs>);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 3);
  assert.equal((html.match(/role="tabpanel"/g) ?? []).length, 3);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
  assert.equal((html.match(/hidden=""/g) ?? []).length, 2);
  for (const name of ["Ventas", "Inventario", "Clientes"]) assert.ok(html.includes(name));
});
