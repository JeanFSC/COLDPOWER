import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductCreateForm } from "../src/components/admin/ProductCreateForm";

const options = { categories: [], families: [], brands: [] };

test("La intención abre el formulario solo con permiso de creación", () => {
  assert.match(renderToStaticMarkup(<ProductCreateForm {...options} initialOpen />), /role="dialog"/);
  assert.doesNotMatch(renderToStaticMarkup(<ProductCreateForm {...options} />), /role="dialog"/);
  assert.doesNotMatch(renderToStaticMarkup(<ProductCreateForm {...options} initialOpen canCreate={false} />), /role="dialog"/);
});
