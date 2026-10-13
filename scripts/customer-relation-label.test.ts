import assert from "node:assert/strict";
import test from "node:test";
import { customerRelationLabel } from "../src/lib/customer-relation-label";

test("Cliente360 traduce cada relación según su dominio", () => {
  assert.equal(customerRelationLabel("opportunities", "QUOTING"), "Cotizando");
  assert.equal(customerRelationLabel("sales", "CONFIRMED"), "Confirmada");
  assert.equal(customerRelationLabel("payments", "CONFIRMED"), "Confirmado");
  assert.equal(customerRelationLabel("orders", "PAID"), "Pagado");
  assert.equal(customerRelationLabel("orders", "DELIVERED"), "Entregado");
  assert.equal(customerRelationLabel("activities", "NOTE"), "Nota");
  assert.equal(customerRelationLabel("tasks", "COMPLETED"), "Completada");
  assert.equal(customerRelationLabel("tasks", "CANCELLED"), "Cancelada");
  assert.equal(customerRelationLabel("tasks", "OVERDUE"), "Vencida");
  assert.equal(customerRelationLabel("tasks", "PENDING"), "Pendiente");
  assert.equal(customerRelationLabel("quotes", "DRAFT"), "Borrador");
  assert.equal(customerRelationLabel("quotes", "Borrador"), "Borrador");
});
