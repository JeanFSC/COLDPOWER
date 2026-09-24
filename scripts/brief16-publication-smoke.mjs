import assert from "node:assert/strict";

const baseUrl = (process.env.BRIEF16_BASE_URL || "http://127.0.0.1:3004").replace(/\/$/, "");
const host = new URL(baseUrl).host;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      host,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} -> ${response.status}: ${typeof payload === "string" ? payload.slice(0, 300) : JSON.stringify(payload)}`);
  }
  return payload;
}

async function publicationAction(ids, action) {
  return request("/api/admin/catalogo/bulk", {
    method: "PATCH",
    body: JSON.stringify({ ids, action }),
  });
}

const page = await request("/api/admin/catalogo?publicationStatus=published&page=1&pageSize=48");
const selected = (page.items || []).filter((item) => typeof item.editorialDescription === "string" && item.editorialDescription.trim().length >= 24).slice(0, 3);
assert.equal(selected.length, 3, "Se necesitan tres productos publicados para el smoke test.");
const ids = selected.map((item) => item.id);
const skus = selected.map((item) => item.sku);

let restored = false;
try {
  const hidden = await publicationAction(ids, "hide");
  assert.equal(hidden.failed.length, 0, "Ocultar los tres productos no debe producir fallos.");

  const hiddenSearch = await Promise.all(skus.map((sku) => request(`/api/catalog/search?q=${encodeURIComponent(sku)}&limit=2`)));
  for (const [index, result] of hiddenSearch.entries()) {
    assert.equal((result.products || []).some((product) => product.sku === skus[index]), false, `El SKU ${skus[index]} no debe seguir visible tras despublicar.`);
  }

  const preflight = await request("/api/admin/catalogo/bulk/preflight", {
    method: "POST",
    body: JSON.stringify({ ids, action: "publish" }),
  });
  assert.equal(preflight.eligible, 3, `El preflight debe permitir los tres productos: ${JSON.stringify(preflight.blocked)}`);

  const published = await publicationAction(ids, "publish");
  assert.equal(published.failed.length, 0, "Publicar los tres productos no debe producir fallos.");
  restored = true;

  const visibleSearch = await Promise.all(skus.map((sku) => request(`/api/catalog/search?q=${encodeURIComponent(sku)}&limit=2`)));
  for (const [index, result] of visibleSearch.entries()) {
    assert.equal((result.products || []).some((product) => product.sku === skus[index]), true, `El SKU ${skus[index]} debe volver al catálogo público.`);
  }

  console.log(JSON.stringify({
    baseUrl,
    ids,
    skus,
    hidden: true,
    preflightEligible: preflight.eligible,
    republished: restored,
    publicAfterRepublish: true,
  }, null, 2));
} finally {
  if (!restored) {
    await publicationAction(ids, "publish").catch((error) => {
      console.error(`No se pudo restaurar el estado publicado: ${error instanceof Error ? error.message : String(error)}`);
    });
  }
}
