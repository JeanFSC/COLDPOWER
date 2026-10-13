import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CompanySettingsHistoryPanel } from "../src/components/admin/CompanySettingsHistoryPanel";

test("Historial: el primer render anuncia carga sin afirmar que no hay versiones", () => {
  const html = renderToStaticMarkup(<CompanySettingsHistoryPanel currentVersion={3} />);
  assert.ok(html.includes('role="status"'));
  assert.ok(html.includes("Cargando historial…"));
  assert.ok(!html.includes("No hay versiones guardadas."));
  assert.ok(!html.includes("Selecciona una versión para revisar sus cambios."));
  assert.match(html, /<button[^>]*disabled=""[^>]*>Actualizar<\/button>/);
});
