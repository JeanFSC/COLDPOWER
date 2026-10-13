import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PricingPager } from "../src/components/admin/PricingPager";

test("pricing pagination boundaries have no links or keyboard focus", () => {
  const render = (page: number, totalPages: number) => renderToStaticMarkup(<PricingPager page={page} totalPages={totalPages} previousHref="/admin/precios?query=QA&page=1" nextHref="/admin/precios?query=QA&page=3" className="pager" />);
  const single = render(1, 1);
  assert.doesNotMatch(single, /<a |href=|tabindex=/i);
  assert.equal((single.match(/aria-disabled="true"/g) ?? []).length, 2);
  const first = render(1, 3);
  assert.match(first, /<span aria-label="Página anterior" aria-disabled="true"/);
  assert.match(first, /<a aria-label="Página siguiente"[^>]*href="\/admin\/precios\?query=QA&amp;page=3"/);
  const last = render(3, 3);
  assert.match(last, /<span aria-label="Página siguiente" aria-disabled="true"/);
  assert.match(last, /<a aria-label="Página anterior"/);
  assert.equal((render(2, 3).match(/<a /g) ?? []).length, 2);
});
