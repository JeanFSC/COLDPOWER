import assert from "node:assert/strict";
import test from "node:test";
import { eq, inArray } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { auditLogs, inventoryBalances, products, users } from "../src/db/schema";
import { purchaseItems, purchaseRequestItems, purchaseRequests, purchases } from "../src/db/purchases-schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { cancelPurchase, createPurchase, createPurchaseRequest, createSupplier, issuePurchase, receivePurchase, transitionPurchaseRequest, updateSupplier } from "../src/lib/purchases-service";
import { validatePurchaseInput, validatePurchaseRequestInput, validateSupplierInput } from "../src/lib/purchases-validation";

test("QA: proveedores, solicitud rechazada y OC cancelada preservan inventario e idempotencia", { skip: process.env.QA_PURCHASE_WORKFLOW !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const tag = `qa-purchases-${crypto.randomUUID()}`;
  const productId = "product-ea613220-8707-42c0-abdb-80b6c2d639d3";
  const locationId = "cp-dashboard-v5-location-branch-2";
  let supplierId: string | undefined;
  const requestIds: string[] = [], purchaseIds: string[] = [];
  let actor: { userId: string; role: string } | undefined;
  try {
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    assert.equal(product.sku, "QA-AUD-20261006");
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: owner.roleCode ?? owner.role };
    const readStock = () => db.select({ id: inventoryBalances.id, onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved }).from(inventoryBalances).where(eq(inventoryBalances.productId, productId)).orderBy(inventoryBalances.id);
    const beforeStock = await readStock();
    const supplierInput = validateSupplierInput({ name: `QA AUDITORÍA — ${tag}`, country: "PE", currency: "PEN", email: `${tag}@example.test`, notes: "QA AUDITORÍA — sin proveedor real", status: "ACTIVE" });
    const supplier = await createSupplier(supplierInput, actor);
    supplierId = supplier.id;
    await assert.rejects(createSupplier(supplierInput, actor), /misma identificación o correo/);
    await assert.rejects(updateSupplier(supplierId, { contactName: "QA AUDITORÍA" }, actor), /motivo/);
    assert.equal((await updateSupplier(supplierId, { contactName: "QA AUDITORÍA", status: "INACTIVE" }, actor, "QA AUDITORÍA — edición de prueba")).status, "INACTIVE");
    const purchaseInput = validatePurchaseInput({ supplierId, locationId, currency: "PEN", createAs: "DRAFT", notes: tag, items: [{ productId, quantity: 2, unitCost: "4.10" }], idempotencyKey: `${tag}-oc` });
    await assert.rejects(createPurchase(purchaseInput, actor), /activo/);
    await updateSupplier(supplierId, { status: "ACTIVE" }, actor, "QA AUDITORÍA — reactivar fixture propia");
    await assert.rejects(createPurchase({ ...purchaseInput, currency: "USD" }, actor), /moneda/);
    const requestInput = validatePurchaseRequestInput({ locationId, source: "MANUAL", notes: tag, items: [{ productId, quantity: 2, notes: "QA AUDITORÍA" }], idempotencyKey: `${tag}-request` });
    const requestCalls = await Promise.allSettled([createPurchaseRequest(requestInput, actor), createPurchaseRequest(requestInput, actor)]);
    const requests = await db.select().from(purchaseRequests).where(eq(purchaseRequests.idempotencyKey, `${tag}-request`));
    requestIds.push(...requests.map(row => row.id));
    const purchaseCalls = await Promise.allSettled([createPurchase(purchaseInput, actor), createPurchase(purchaseInput, actor)]);
    const purchaseRows = await db.select().from(purchases).where(eq(purchases.idempotencyKey, `${tag}-oc`));
    purchaseIds.push(...purchaseRows.map(row => row.id));
    console.log(JSON.stringify({ tag, supplierId, requestCalls: requestCalls.map(result => result.status), purchaseCalls: purchaseCalls.map(result => result.status), persistedRequests: requests.length, persistedPurchases: purchaseRows.length }));
    assert.equal(requestCalls.filter(result => result.status === "fulfilled").length, 2);
    assert.equal(purchaseCalls.filter(result => result.status === "fulfilled").length, 2);
    assert.equal(requests.length, 1);
    assert.equal(purchaseRows.length, 1);
    const requestId = requests[0].id, purchaseId = purchaseRows[0].id;
    assert.equal(requestCalls.filter(result => result.status === "fulfilled" && result.value.idempotent).length, 1);
    assert.equal(purchaseCalls.filter(result => result.status === "fulfilled" && result.value.idempotent).length, 1);
    assert.equal((await db.select().from(purchaseRequestItems).where(eq(purchaseRequestItems.requestId, requestId))).length, 1);
    const savedItems = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
    assert.equal(savedItems.length, 1);
    assert.equal(savedItems[0].unitCost, "4.10");
    await assert.rejects(transitionPurchaseRequest(requestId, "APPROVED", actor), /No se puede/);
    assert.equal((await transitionPurchaseRequest(requestId, "SUBMITTED", actor)).status, "SUBMITTED");
    await assert.rejects(transitionPurchaseRequest(requestId, "REJECTED", actor), /motivo/);
    assert.equal((await transitionPurchaseRequest(requestId, "REJECTED", actor, "QA AUDITORÍA — rechazo simulado")).status, "REJECTED");
    await assert.rejects(transitionPurchaseRequest(requestId, "APPROVED", actor), /No se puede/);
    const cancelledRequest = await createPurchaseRequest({ ...requestInput, idempotencyKey: `${tag}-cancel` }, actor);
    requestIds.push(cancelledRequest.request.id);
    assert.equal((await transitionPurchaseRequest(cancelledRequest.request.id, "CANCELLED", actor, "QA AUDITORÍA — cancelación")).status, "CANCELLED");
    assert.equal(purchaseRows[0].status, "DRAFT");
    assert.equal(purchaseRows[0].subtotal, "8.20");
    await assert.rejects(receivePurchase({ purchaseId, items: [{ productId, quantity: 1 }] }, actor), /Solo se pueden recibir/);
    assert.equal((await issuePurchase(purchaseId, actor)).status, "PENDING");
    await assert.rejects(issuePurchase(purchaseId, actor), /Solo un borrador/);
    await assert.rejects(cancelPurchase(purchaseId, "", actor), /motivo/);
    assert.equal((await cancelPurchase(purchaseId, "QA AUDITORÍA — cancelar sin recepción", actor)).status, "CANCELLED");
    await assert.rejects(receivePurchase({ purchaseId, items: [{ productId, quantity: 1 }] }, actor), /Solo se pueden recibir/);
    assert.deepEqual(await readStock(), beforeStock);
    const audit = await db.select().from(auditLogs).where(inArray(auditLogs.entityId, [requestId, purchaseId]));
    for (const action of ["purchases.request_created", "purchases.request_submitted", "purchases.request_rejected", "purchases.purchase_created", "purchases.purchase_issued", "purchases.purchase_cancelled"]) assert.equal(audit.filter(row => row.action === action).length, 1, action);
    console.log(JSON.stringify({ tag, requestId, rejected: true, cancelledRequestId: cancelledRequest.request.id, purchaseId, cancelledPurchase: true, inventoryUnchanged: true }));
  } finally {
    try {
      if (actor) {
        for (const requestId of requestIds) {
          const [row] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, requestId));
          if (["DRAFT", "SUBMITTED", "APPROVED"].includes(row.status)) await transitionPurchaseRequest(requestId, "CANCELLED", actor, "QA AUDITORÍA — cierre fixture");
        }
        for (const purchaseId of purchaseIds) {
          const [row] = await db.select().from(purchases).where(eq(purchases.id, purchaseId));
          if (["DRAFT", "PENDING"].includes(row.status)) await cancelPurchase(purchaseId, "QA AUDITORÍA — cierre fixture", actor);
        }
        if (supplierId) assert.equal((await updateSupplier(supplierId, { status: "INACTIVE" }, actor, "QA AUDITORÍA — cierre fixture")).status, "INACTIVE");
      }
    } finally { await closeDb(); }
  }
});
