import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppliedFilters } from "../src/components/catalog/AppliedFilters";

test("removing one catalog filter preserves other facets, query and sort", () => {
  const html = renderToStaticMarkup(<AppliedFilters filters={{ query: "cobre, 1/4", family: ["cap", "other"], productType: "Capacitor", sort: "price-asc" }} families={[{slug:"cap",name:"Capacitores"}]} />);
  assert.match(html, /Familia: Capacitores/);
  assert.match(html, /Búsqueda: cobre, 1\/4/);
  const typeLink = html.match(/href="([^"]+)"[^>]*>Tipo: Capacitor/);
  assert.ok(typeLink);
  const params = new URL(typeLink[1].replaceAll("&amp;", "&"), "http://localhost").searchParams;
  assert.equal(params.get("tipo"), null);
  assert.deepEqual(params.getAll("familia"), ["cap", "other"]);
  assert.equal(params.get("q"), "cobre, 1/4");
  assert.equal(params.get("orden"), "price-asc");
});
