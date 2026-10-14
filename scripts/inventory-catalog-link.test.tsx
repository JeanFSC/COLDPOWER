import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InventoryCatalogAccess, InventoryCatalogLink } from "../src/components/admin/InventoryCatalogLink";

test("inventario: ficha accesible solo con permiso editorial", () => {
 for(const canOpen of [false,true]) {
  const html=renderToStaticMarkup(<InventoryCatalogAccess canOpen={canOpen}><InventoryCatalogLink productId="producto QA">SKU QA</InventoryCatalogLink></InventoryCatalogAccess>);
  assert.ok(html.includes("SKU QA"));
  if(canOpen) assert.match(html,/href="\/admin\/catalogo\/producto%20QA"/);
  else assert.doesNotMatch(html,/<a\b|href=/);
 }
});
test("inventario: ausencia de proveedor o ID no crea enlaces inválidos", () => {
 assert.doesNotMatch(renderToStaticMarkup(<InventoryCatalogLink productId="qa">QA</InventoryCatalogLink>),/<a\b/);
 assert.doesNotMatch(renderToStaticMarkup(<InventoryCatalogAccess canOpen><InventoryCatalogLink productId="">QA</InventoryCatalogLink></InventoryCatalogAccess>),/<a\b/);
});