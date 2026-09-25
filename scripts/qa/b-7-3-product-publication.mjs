import path from "node:path";
import {
  artifactPath,
  capture,
  captureSql,
  closeQaBrowser,
  compactError,
  createQaBrowser,
  probeApi,
  resultRecord,
  runSql,
  visit,
  writeJson,
} from "./b-helpers.mjs";

const scenario = "B7.3-product-media-publication";
const stage = process.env.QA_STAGE || "run";
const productId = "product-cp-ref-tar-0810";
const sku = "CP-REF-TAR-0810";
const slug = "tarjeta-lg-con-cable-6871jb1103h";
const productName = "TARJETA LG CON CABLE 6871JB1103H";
const imagePath = path.resolve(process.cwd(), "public/images/home/placa-equipo.webp");

function firstRow(query) {
  const line = runSql(query).split(/\r?\n/)[0]?.trim();
  if (!line) throw new Error("No se encontro el registro esperado en PostgreSQL local.");
  return line.split("\t");
}

function recordStage(value) {
  writeJson(artifactPath(scenario, `result-${stage}.json`), { scenario, stage, generatedAt: new Date().toISOString(), ...value });
  return resultRecord(scenario, value);
}

async function openCatalogProduct(page) {
  await visit(page, `/admin/catalogo?query=${encodeURIComponent(sku)}`);
  const row = page.getByText(sku, { exact: true }).first().locator("xpath=ancestor::tr");
  await row.waitFor({ state: "visible", timeout: 15_000 });
  return row;
}

async function selectProduct(page) {
  const row = await openCatalogProduct(page);
  const checkbox = row.getByRole("checkbox").first();
  await checkbox.click();
  await page.waitForTimeout(300);
  return row;
}

async function hideThroughUi(page, captureLabel) {
  await selectProduct(page);
  const chooseHideAction = page.getByRole("button", { name: "Despublicar", exact: true }).last();
  await chooseHideAction.waitFor({ state: "visible", timeout: 15_000 });
  await chooseHideAction.click();
  const hideButton = page.getByRole("button", { name: /Despublicar productos/ }).last();
  await hideButton.waitFor({ state: "visible", timeout: 15_000 });
  page.once("dialog", (dialog) => dialog.accept());
  const responsePromise = page
    .waitForResponse((response) => response.url().endsWith("/api/admin/catalogo/bulk") && response.request().method() === "PATCH", { timeout: 20_000 })
    .catch(() => null);
  await hideButton.click();
  const response = await responsePromise;
  await page.waitForTimeout(1_500);
  await capture(scenario, captureLabel, page);
  return response ? { status: response.status(), body: await response.text() } : null;
}

async function publishThroughUi(page, captureLabel) {
  await selectProduct(page);
  const choosePublishAction = page.getByRole("button", { name: "Publicar seleccionados", exact: true }).last();
  await choosePublishAction.waitFor({ state: "visible", timeout: 15_000 });
  await choosePublishAction.click();
  const publishButton = page.getByRole("button", { name: "Publicar seleccionados", exact: true }).nth(1);
  await publishButton.waitFor({ state: "visible", timeout: 15_000 });
  const preflightPromise = page
    .waitForResponse((response) => response.url().endsWith("/api/admin/catalogo/bulk/preflight") && response.request().method() === "POST", { timeout: 20_000 })
    .catch(() => null);
  await publishButton.click();
  const preflightResponse = await preflightPromise;
  await page.getByRole("dialog", { name: /Revisar publicaci/ }).waitFor({ state: "visible", timeout: 15_000 }).catch(async () => {
    await page.getByRole("dialog").first().waitFor({ state: "visible", timeout: 5_000 });
  });
  const dialog = page.getByRole("dialog").first();
  const dialogText = await dialog.innerText();
  const confirmButton = dialog.getByRole("button", { name: /Publicar 1 productos/ });
  await confirmButton.waitFor({ state: "visible", timeout: 10_000 });
  const publishResponsePromise = page
    .waitForResponse((response) => response.url().endsWith("/api/admin/catalogo/bulk") && response.request().method() === "PATCH", { timeout: 20_000 })
    .catch(() => null);
  await confirmButton.click();
  const publishResponse = await publishResponsePromise;
  await page.waitForTimeout(1_700);
  await capture(scenario, captureLabel, page);
  return {
    preflight: preflightResponse ? { status: preflightResponse.status(), body: await preflightResponse.text() } : null,
    dialogText,
    response: publishResponse ? { status: publishResponse.status(), body: await publishResponse.text() } : null,
  };
}

const session = await createQaBrowser(scenario);
const { page } = session;
const evidence = { scenario, stage, productId, sku, slug, imagePath, stages: [] };

try {
  if (stage === "run") {
    if (!await import("node:fs").then(({ existsSync }) => existsSync(imagePath))) throw new Error(`No existe el asset QA: ${imagePath}`);
    const before = firstRow(`SELECT id,sku,publication_status,slug FROM products WHERE id='${productId}';`);
    evidence.before = { publicationStatus: before[2], slug: before[3] };
    captureSql(scenario, "before", `SELECT id,sku,publication_status,slug FROM products WHERE id='${productId}'; SELECT mau.asset_id,mau.slot,ma.original_filename,ma.public_url,ma.status FROM media_asset_usages mau JOIN media_assets ma ON ma.id=mau.asset_id WHERE mau.entity_type='product' AND mau.entity_id='${productId}';`);

    await visit(page, `/admin/catalogo?query=${encodeURIComponent(sku)}`);
    await capture(scenario, "01-catalog-before", page);
    let hideResult = null;
    if (before[2] === "published") hideResult = await hideThroughUi(page, "02-product-hidden");
    const hidden = firstRow(`SELECT publication_status FROM products WHERE id='${productId}';`)[0];
    evidence.hideBeforeUpload = { response: hideResult, persistedStatus: hidden };
    evidence.stages.push({ stage: "initial_hide_ui_mutation", completed: before[2] !== "published" || hidden === "hidden", responseStatus: hideResult?.status ?? null });
    captureSql(scenario, "after-initial-hide", `SELECT id,sku,publication_status,publication_changed_by,publication_changed_at FROM products WHERE id='${productId}'; SELECT action,entity_type,entity_id,actor_id,actor_role,created_at,"before","after" FROM audit_logs WHERE entity_type='product' AND entity_id='${productId}' ORDER BY created_at DESC LIMIT 6;`);

    await visit(page, `/admin/catalogo/${encodeURIComponent(productId)}`);
    await capture(scenario, "03-product-detail-before-media", page);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(imagePath);
    await page.getByText("Imagen subida y marcada como principal.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    await page.waitForTimeout(800);
    await capture(scenario, "04-product-media-uploaded", page);
    const mediaAfter = firstRow(`SELECT mau.asset_id,mau.slot,ma.original_filename,ma.public_url,ma.status FROM media_asset_usages mau JOIN media_assets ma ON ma.id=mau.asset_id WHERE mau.entity_type='product' AND mau.entity_id='${productId}' AND mau.slot='primary' ORDER BY mau.created_at DESC LIMIT 1;`);
    evidence.media = { assetId: mediaAfter[0], slot: mediaAfter[1], filename: mediaAfter[2], publicUrl: mediaAfter[3], status: mediaAfter[4] };
    captureSql(scenario, "after-media", `SELECT mau.asset_id,mau.slot,ma.original_filename,ma.public_url,ma.status,ma.uploaded_by FROM media_asset_usages mau JOIN media_assets ma ON ma.id=mau.asset_id WHERE mau.entity_type='product' AND mau.entity_id='${productId}' ORDER BY mau.created_at DESC LIMIT 5; SELECT action,entity_type,entity_id,actor_id,actor_role,created_at,"before","after" FROM audit_logs WHERE entity_type='product' AND entity_id='${productId}' ORDER BY created_at DESC LIMIT 10;`);
    evidence.stages.push({ stage: "product_media_ui_mutation", completed: Boolean(mediaAfter[0]), primaryAssetId: mediaAfter[0] });

    const publishResult = await publishThroughUi(page, "05-product-published");
    const published = firstRow(`SELECT publication_status FROM products WHERE id='${productId}';`)[0];
    evidence.publish = { response: publishResult, persistedStatus: published };
    captureSql(scenario, "after-publish", `SELECT id,sku,publication_status,publication_changed_by,publication_changed_at FROM products WHERE id='${productId}'; SELECT action,entity_type,entity_id,actor_id,actor_role,created_at,"before","after" FROM audit_logs WHERE entity_type='product' AND entity_id='${productId}' ORDER BY created_at DESC LIMIT 12;`);
    if (published !== "published") throw new Error(`La publicación UI no persistió published: ${published}`);
    evidence.stages.push({ stage: "product_publish_ui_mutation", completed: true, persistedStatus: published });

    const publicResponse = await visit(page, `/producto/${encodeURIComponent(slug)}`);
    await page.waitForTimeout(1_000);
    await capture(scenario, "06-public-product-with-own-photo", page);
    const publicBody = await page.locator("body").innerText();
    const publicImages = await page.locator("img").evaluateAll((images) => images.map((image) => ({ alt: image.alt, src: image.getAttribute("src") || "" })));
    evidence.publicView = { status: publicResponse?.status() ?? null, finalUrl: page.url(), hasProductName: publicBody.includes(productName) || publicBody.includes(sku), images: publicImages.filter((image) => image.alt.includes("TARJETA") || image.alt.includes("LG") || image.src.includes("media")) };
    evidence.stages.push({ stage: "public_product_ui_verification", completed: evidence.publicView.hasProductName && evidence.publicView.status === 200, status: evidence.publicView.status });

    const finalHide = await hideThroughUi(page, "07-product-unpublished");
    const unpublished = firstRow(`SELECT publication_status FROM products WHERE id='${productId}';`)[0];
    evidence.unpublish = { response: finalHide, persistedStatus: unpublished };
    captureSql(scenario, "after-unpublish", `SELECT id,sku,publication_status,publication_changed_by,publication_changed_at FROM products WHERE id='${productId}'; SELECT action,entity_type,entity_id,actor_id,actor_role,created_at,"before","after" FROM audit_logs WHERE entity_type='product' AND entity_id='${productId}' ORDER BY created_at DESC LIMIT 18;`);
    if (unpublished !== "hidden") throw new Error(`La despublicacion UI no persistio hidden: ${unpublished}`);
    evidence.stages.push({ stage: "product_unpublish_ui_mutation", completed: true, persistedStatus: unpublished });

    const hiddenPublicResponse = await visit(page, `/producto/${encodeURIComponent(slug)}`);
    await page.waitForTimeout(1_000);
    await capture(scenario, "08-public-product-after-unpublish", page);
    const hiddenBody = await page.locator("body").innerText();
    evidence.publicAfterUnpublish = { status: hiddenPublicResponse?.status() ?? null, finalUrl: page.url(), stillShowsProduct: hiddenBody.includes(productName) };
    evidence.stages.push({ stage: "public_hidden_verification", completed: !evidence.publicAfterUnpublish.stillShowsProduct || evidence.publicAfterUnpublish.status !== 200, status: evidence.publicAfterUnpublish.status });
    captureSql(scenario, "final", `SELECT id,sku,publication_status,slug FROM products WHERE id='${productId}'; SELECT mau.asset_id,mau.slot,ma.original_filename,ma.public_url,ma.status FROM media_asset_usages mau JOIN media_assets ma ON ma.id=mau.asset_id WHERE mau.entity_type='product' AND mau.entity_id='${productId}';`);
    const completed = evidence.stages.every((item) => item.completed);
    recordStage({ outcome: completed ? "COMPLETED" : "BLOCKED_UI_CONTRACT", ...evidence });
    console.log(JSON.stringify({ outcome: completed ? "COMPLETED" : "BLOCKED_UI_CONTRACT", ...evidence }, null, 2));
    if (!completed) process.exitCode = 1;
  } else if (stage === "prohibited") {
    await visit(page, `/admin/catalogo?query=${encodeURIComponent(sku)}`);
    await capture(scenario, "09-ventas-catalog-ui", page);
    const publishButtons = await page.getByRole("button", { name: "Publicar seleccionados", exact: true }).count();
    const preflight = await probeApi(page, "/api/admin/catalogo/bulk/preflight", { method: "POST", headers: { "Content-Type": "application/json" }, data: JSON.stringify({ ids: [productId], action: "publish" }) });
    const patch = await probeApi(page, "/api/admin/catalogo/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, data: JSON.stringify({ ids: [productId], action: "publish" }) });
    writeJson(artifactPath(scenario, "10-prohibited-ventas.json"), { publishButtons, preflight, patch });
    const status = firstRow(`SELECT publication_status FROM products WHERE id='${productId}';`)[0];
    captureSql(scenario, "prohibited-ventas", `SELECT id,sku,publication_status FROM products WHERE id='${productId}';`);
    evidence.ui = { publishButtonsVisible: publishButtons };
    evidence.api = { preflightStatus: preflight.status, patchStatus: patch.status };
    evidence.persistedStatus = status;
    const denied = preflight.status === 403 && patch.status === 403 && status === "hidden";
    evidence.stages.push({ stage: "ventas_prohibited_publication_verification", completed: denied, expectedApiStatus: 403 });
    recordStage({ outcome: denied ? "SUPPLEMENTAL_COMPLETED" : "SUPPLEMENTAL_BLOCKED", ...evidence });
    console.log(JSON.stringify({ outcome: denied ? "SUPPLEMENTAL_COMPLETED" : "SUPPLEMENTAL_BLOCKED", ...evidence }, null, 2));
    if (!denied) process.exitCode = 1;
  } else {
    throw new Error(`QA_STAGE desconocido: ${stage}`);
  }
} catch (error) {
  await capture(scenario, `error-${stage}`, page).catch(() => undefined);
  writeJson(artifactPath(scenario, `error-${stage}.json`), { error: compactError(error), evidence, browserEvents: session.events });
  recordStage({ outcome: "BLOCKED", error: compactError(error), ...evidence });
  console.log(JSON.stringify({ outcome: "BLOCKED", error: compactError(error), ...evidence }, null, 2));
  process.exitCode = 1;
} finally {
  await closeQaBrowser(session);
}
