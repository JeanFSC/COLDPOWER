import assert from "node:assert/strict";
import test from "node:test";
import { customerCreateStepError } from "../src/lib/customer-create-step";

test("identity validates company RUC in its own step", () => {
  for (const customerType of ["EMPRESA", "COMPANY"]) {
    assert.equal(customerCreateStepError({ name: "QA", customerType, ruc: "" }, 1), "El RUC es obligatorio para empresas.");
    assert.match(customerCreateStepError({ name: "QA", customerType, ruc: "20000000000" }, 1) ?? "", /RUC no es válido/);
    assert.equal(customerCreateStepError({ name: "QA", customerType, ruc: "20100070970" }, 1), null);
  }
  assert.equal(customerCreateStepError({ name: "QA", customerType: "PERSON", ruc: "" }, 1), null);
  assert.equal(customerCreateStepError({ name: "", customerType: "PERSON" }, 1), "El nombre del cliente es obligatorio.");
});

test("contact validates only contact fields with the server rules", () => {
  assert.equal(customerCreateStepError({ email: "incorrecto", phone: "" }, 2), "El correo electrónico no es válido.");
  assert.equal(customerCreateStepError({ email: "qa@example.test", phone: "123" }, 2), "El teléfono no es válido.");
  assert.equal(customerCreateStepError({ email: "qa@example.test", phone: "900000006" }, 2), null);
  assert.equal(customerCreateStepError({ email: "", phone: "" }, 2), null);
});
