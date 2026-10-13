import assert from "node:assert/strict";
import test from "node:test";
import { familyFilterOptions, filterOptionsWithSelection } from "../src/lib/filter-options";

test("empty results keep the applied filter available", () => {
  assert.deepEqual(filterOptionsWithSelection([], "CONFIRMED"), ["CONFIRMED"]);
  assert.deepEqual(filterOptionsWithSelection([], "TRANSFER"), ["TRANSFER"]);
  assert.deepEqual(filterOptionsWithSelection([], "DELIVERED"), ["DELIVERED"]);
});

test("same-name families remain distinct and identify their category", () => {
  const families = [
    { id: "f1", name: "Motores", categoryId: "c1" },
    { id: "f2", name: "Motores", categoryId: "c2" },
  ];
  assert.deepEqual(familyFilterOptions(families, [
    { id: "c1", name: "Licuadoras" },
    { id: "c2", name: "Otros electrodomésticos" },
  ]), [
    { value: "f1", label: "Motores · Licuadoras" },
    { value: "f2", label: "Motores · Otros electrodomésticos" },
  ]);
  assert.equal(families[0].name, "Motores");
});

test("families with an unavailable category remain selectable without inventing its name", () => {
  assert.deepEqual(familyFilterOptions([{ id: "f1", name: "Otros", categoryId: "c1" }], []),
    [{ value: "f1", label: "Otros · Categoría c1" }]);
  assert.deepEqual(familyFilterOptions([], []), []);
});

test("facets retain order without duplicating the selection or mutating input", () => {
  const values = ["PENDING", "CONFIRMED"];
  assert.deepEqual(filterOptionsWithSelection(values, "CONFIRMED"), values);
  assert.deepEqual(filterOptionsWithSelection(values, "CANCELLED"), [...values, "CANCELLED"]);
  assert.deepEqual(filterOptionsWithSelection(values, ""), values);
  assert.deepEqual(values, ["PENDING", "CONFIRMED"]);
});
