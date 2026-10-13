import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fetchQuoteLookup, QuoteLookupStatus, useQuoteLookup } from "../src/components/admin/QuoteLookup";

test("La búsqueda valida HTTP y contrato antes de devolver resultados", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options?.signal, controller.signal);
      assert.equal(options?.cache, "no-store");
      return Response.json({ items: [{ id: "QA" }] });
    };
    assert.deepEqual(await fetchQuoteLookup("/api/qa", controller.signal, "Error QA"), [{ id: "QA" }]);
    globalThis.fetch = async () => Response.json({ error: { message: "Consulta no disponible" } }, { status: 503 });
    await assert.rejects(fetchQuoteLookup("/api/qa", controller.signal, "Error QA"), /Consulta no disponible/);
    globalThis.fetch = async () => Response.json({ success: true });
    await assert.rejects(fetchQuoteLookup("/api/qa", controller.signal, "Error QA"), /Error QA/);
    globalThis.fetch = async () => new Response("No JSON", { status: 403 });
    await assert.rejects(fetchQuoteLookup("/api/qa", controller.signal, "Error QA"), /Error QA/);
  } finally {
    globalThis.fetch = original;
  }
});

test("La primera búsqueda anuncia carga y no afirma ausencia de resultados", () => {
  function Probe() {
    const lookup = useQuoteLookup<{ id: string }>("/api/qa", "Error QA");
    return <QuoteLookupStatus query="QA" kind="clientes" {...lookup} count={lookup.items.length} />;
  }
  const html = renderToStaticMarkup(<Probe />);
  assert.match(html, /role="status"/);
  assert.match(html, /Buscando clientes/);
  assert.ok(!html.includes("No se encontraron"));
});

test("Vacío, error, reintento y consulta corta son estados distintos", () => {
  const base = { query: "QA", kind: "productos" as const, loading: false, error: "", count: 0, retry() {} };
  const empty = renderToStaticMarkup(<QuoteLookupStatus {...base} />);
  assert.match(empty, /No se encontraron productos/);
  assert.match(empty, /role="status"/);
  const failed = renderToStaticMarkup(<QuoteLookupStatus {...base} error="No se pudieron buscar productos." />);
  assert.match(failed, /role="alert"/);
  assert.match(failed, /aria-label="Reintentar búsqueda de productos"/);
  assert.ok(!failed.includes("No se encontraron"));
  const short = renderToStaticMarkup(<QuoteLookupStatus {...base} query="Q" />);
  assert.match(short, /al menos 2 caracteres/);
  assert.ok(!short.includes("No se encontraron"));
  const single = renderToStaticMarkup(<QuoteLookupStatus {...base} count={1} />);
  assert.match(single, /1 producto encontrado/);
});
