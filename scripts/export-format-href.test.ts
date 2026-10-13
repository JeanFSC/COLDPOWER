import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { exportFormatHref } from "../src/lib/export-format-href";

test("export format selection preserves filters and replaces an old format", () => {
  const href = exportFormatHref("/api/admin/dashboard/export?format=pdf&currency=PEN&query=QA%26AUD&locationId=cusco#detail", "xlsx");
  const url = new URL(href, "http://localhost");
  assert.equal(url.pathname, "/api/admin/dashboard/export");
  assert.deepEqual(url.searchParams.getAll("format"), ["xlsx"]);
  assert.equal(url.searchParams.get("currency"), "PEN");
  assert.equal(url.searchParams.get("query"), "QA&AUD");
  assert.equal(url.searchParams.get("locationId"), "cusco");
  assert.equal(url.hash, "#detail");
});

test("Kardex format selection retains both inventory identifiers", () => {
  const query = new URL(exportFormatHref("/api/admin/inventario/kardex/export?productId=p%261&locationId=l%3D2", "csv"), "http://localhost").searchParams;
  assert.equal(query.get("productId"), "p&1");
  assert.equal(query.get("locationId"), "l=2");
  assert.equal(query.get("format"), "csv");
});

test("dashboard and Kardex expose the formats supported by their routes", () => {
  assert.match(readFileSync("src/components/admin/AdminTanda2Workspaces.tsx", "utf8"), /label="Exportar dashboard" formats=\{\["xlsx", "csv", "pdf"\]\}/);
  assert.match(readFileSync("src/components/admin/InventoryAdminWorkspace.tsx", "utf8"), /label="Exportar Kardex" formats=\{\["xlsx", "csv"\]\}/);
});
