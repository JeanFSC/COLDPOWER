import assert from "node:assert/strict";
import test from "node:test";
import { parseInventoryDetailReservationFilters as parse } from "../src/lib/inventory-detail-reservation-filters";

test("detalle: requiere producto/local y normaliza espacios", () => {
  for (const input of ["", "productId=p", "locationId=l", "productId=+&locationId=l", "productId=p&locationId=+"]) assert.equal(parse(new URLSearchParams(input)), null);
  assert.deepEqual(parse(new URLSearchParams("productId=+p+&locationId=+l+")), { productId: "p", locationId: "l", page: 1 });
});
test("detalle: páginas enteras seguras, positivas y decimales", () => {
  for (const page of ["", "0", "-1", "1.5", "NaN", "Infinity", "1e2", "0x10", "9007199254740992"]) assert.equal(parse(new URLSearchParams({ productId: "p", locationId: "l", page })), null);
  assert.equal(parse(new URLSearchParams("productId=p&locationId=l&page=2"))?.page, 2);
});
test("detalle: ignora filtros/página del listado global", () => {
  assert.deepEqual(parse(new URLSearchParams("productId=p&locationId=l&reservationStatus=ACTIVE&reservationPage=2")), { productId: "p", locationId: "l", page: 1 });
});
