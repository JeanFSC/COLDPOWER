import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorMessage } from "../src/lib/api-error-message";

test("API: presenta el mensaje estructurado sin convertir objetos a texto", () => {
  assert.equal(apiErrorMessage({ code: "INVALID_COLOR", message: "El color no es válido." }, "Error"), "El color no es válido.");
  assert.equal(apiErrorMessage("Error antiguo", "Error"), "Error antiguo");
});

test("API: respuestas vacías o malformadas conservan un fallback legible", () => {
  for (const error of [null, undefined, {}, { message: {} }, { message: " " }, " ", 500]) {
    assert.equal(apiErrorMessage(error, "No se pudo guardar."), "No se pudo guardar.");
  }
});
