import assert from "node:assert/strict";
import test from "node:test";
import { assertOpportunityTransition, canTransitionOpportunity, validateCustomerInput, validateOpportunityInput } from "../src/lib/crm-validation";

test("la edición parcial conserva el nombre cuando no se envía", () => {
  assert.deepEqual(validateCustomerInput({ notes: "  QA AUDITORÍA  " }, true), { notes: "QA AUDITORÍA" });
  assert.deepEqual(validateCustomerInput({ status: "INACTIVE" }, true), { status: "INACTIVE" });
  assert.deepEqual(validateCustomerInput({}, true), {});
  assert.deepEqual(validateCustomerInput({ name: "  Cliente QA  " }, true), { name: "Cliente QA" });
});

test("la edición parcial rechaza borrar el nombre obligatorio", () => {
  for (const name of ["", "   ", null, 42]) {
    assert.throws(() => validateCustomerInput({ name }, true), /nombre.*obligatorio/);
  }
});

test("CRM valida tipos de cliente y conserva datos opcionales", () => {
  const customer = validateCustomerInput({ name: "  Cliente real ", customerType: "EMPRESA", ruc: "20123456786" });
  assert.equal(customer.name, "Cliente real");
  assert.equal(customer.customerType, "EMPRESA");
  assert.throws(() => validateCustomerInput({ name: "x", customerType: "FICTICIO" }));
});

test("pipeline permite solo transiciones declaradas", () => {
  assert.equal(canTransitionOpportunity("NEW", "CONTACTED"), true);
  assert.equal(canTransitionOpportunity("NEW", "PAID"), false);
  assert.doesNotThrow(() => assertOpportunityTransition("QUOTE_SENT", "FOLLOW_UP"));
  assert.throws(() => assertOpportunityTransition("CLOSED", "NEW"));
});

test("oportunidad exige cliente, etapa y origen válidos", () => {
  const opportunity = validateOpportunityInput({ customerId: "customer-1", title: "Solicitud HVAC", stage: "QUOTING", origin: "WEB" });
  assert.equal(opportunity.stage, "QUOTING");
  assert.throws(() => validateOpportunityInput({ customerId: "", stage: "NEW", origin: "WEB" }));
});
