import assert from "node:assert/strict";
import test from "node:test";
import { assertOpportunityTransition, canTransitionOpportunity, validateCustomerInput, validateOpportunityInput } from "../src/lib/crm-validation";

test("CRM valida tipos de cliente y conserva datos opcionales", () => {
  const customer = validateCustomerInput({ name: "  Cliente real ", customerType: "EMPRESA", ruc: "20123456789" });
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
