import assert from "node:assert/strict";
import test from "node:test";
import { requestIntegrationTest } from "../src/lib/integration-test-request";

test("prueba de integración presenta errores HTTP, respuesta inválida y red", async () => {
  await assert.rejects(requestIntegrationTest("qa", async () => Response.json({ error: { message: "No tienes permiso." } }, { status: 403 })), /No tienes permiso/);
  await assert.rejects(requestIntegrationTest("qa", async () => new Response("Error", { status: 503 })), /No se pudo probar/);
  await assert.rejects(requestIntegrationTest("qa", async () => { throw new Error("network"); }), /No se pudo conectar/);
  await assert.rejects(requestIntegrationTest("qa", async () => new Response("html")), /respuesta no válida/);
});
test("prueba válida utiliza POST y codifica la clave de integración", async () => {
  await requestIntegrationTest("qa/key", async (url, options) => {
    assert.equal(url, "/api/admin/configuracion/integraciones/qa%2Fkey/probar");
    assert.equal(options?.method, "POST");
    return Response.json({ results: [] });
  });
});
