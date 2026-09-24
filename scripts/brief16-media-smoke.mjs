import assert from "node:assert/strict";

const baseUrl = (process.env.BRIEF16_BASE_URL || "http://127.0.0.1:3004").replace(/\/$/, "");
const host = new URL(baseUrl).host;

async function request(path, options = {}) {
  const body = options.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = { host, ...(options.headers || {}) };
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: isFormData || typeof body === "string" || body === undefined ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path} -> ${response.status}: ${typeof payload === "string" ? payload.slice(0, 300) : JSON.stringify(payload)}`);
  return payload;
}

async function htmlPage(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { host } });
  const html = await response.text();
  if (!response.ok) throw new Error(`GET ${path} -> ${response.status}: ${html.slice(0, 300)}`);
  return html;
}

const page = await request("/api/admin/catalogo?publicationStatus=published&hasMedia=false&page=1&pageSize=48");
const product = (page.items || []).find((item) => item.slug && item.id);
assert.ok(product, "Se necesita un producto publicado sin media para la prueba.");
const productId = product.id;
const slug = product.slug;
const productName = product.name || product.normalizedName || product.sku;
let assetId = null;
let associationRemoved = false;
let assetArchived = false;

try {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const form = new FormData();
  form.set("file", new Blob([png], { type: "image/png" }), "brief16-e2e.png");
  form.set("altText", productName);
  const upload = await request("/api/admin/media", { method: "POST", body: form });
  assetId = upload.asset?.id;
  assert.ok(assetId, "La subida debe devolver el ID del asset.");

  const associated = await request(`/api/admin/catalogo/${encodeURIComponent(productId)}/media`, {
    method: "POST",
    body: { assetId, slot: "primary", sortOrder: 0 },
    headers: { "content-type": "application/json" },
  });
  assert.equal(associated.usage?.assetId, assetId);

  const detailWithMedia = await request(`/api/admin/catalogo/${encodeURIComponent(productId)}`);
  assert.equal(detailWithMedia.product?.media?.[0]?.assetId, assetId);
  assert.equal(detailWithMedia.product?.media?.[0]?.slot, "primary");

  const publicWithMedia = await htmlPage(`/producto/${encodeURIComponent(slug)}`);
  assert.match(publicWithMedia, new RegExp(`/api/media/${assetId}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const primaryGalleryIndex = publicWithMedia.indexOf('data-media-state="primary"');
  assert.notEqual(primaryGalleryIndex, -1);
  assert.doesNotMatch(publicWithMedia.slice(primaryGalleryIndex, primaryGalleryIndex + 4000), /Imagen referencial/);

  await request(`/api/admin/catalogo/${encodeURIComponent(productId)}/media?assetId=${encodeURIComponent(assetId)}`, { method: "DELETE" });
  associationRemoved = true;
  const detailWithoutMedia = await request(`/api/admin/catalogo/${encodeURIComponent(productId)}`);
  assert.equal(detailWithoutMedia.product?.media?.length, 0);
  const publicWithPlaceholder = await htmlPage(`/producto/${encodeURIComponent(slug)}`);
  const placeholderGalleryIndex = publicWithPlaceholder.indexOf('data-media-state="placeholder"');
  assert.notEqual(placeholderGalleryIndex, -1);
  assert.match(publicWithPlaceholder.slice(placeholderGalleryIndex, placeholderGalleryIndex + 4000), /Imagen referencial/);

  const archived = await request(`/api/admin/media/${encodeURIComponent(assetId)}`, { method: "DELETE" });
  assert.equal(archived.asset?.status, "ARCHIVED");
  assetArchived = true;

  console.log(JSON.stringify({
    baseUrl,
    product: { id: productId, sku: product.sku, slug },
    assetId,
    uploadAssociatedPrimary: true,
    publicWithoutReferenceChip: true,
    associationRemoved: true,
    publicPlaceholderRestored: true,
    assetArchived: true,
  }, null, 2));
} finally {
  if (assetId && !associationRemoved) {
    await request(`/api/admin/catalogo/${encodeURIComponent(productId)}/media?assetId=${encodeURIComponent(assetId)}`, { method: "DELETE" }).catch(() => undefined);
  }
  if (assetId && !assetArchived) {
    await request(`/api/admin/media/${encodeURIComponent(assetId)}`, { method: "DELETE" }).catch(() => undefined);
  }
}
