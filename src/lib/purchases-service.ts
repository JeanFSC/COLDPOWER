import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, locations, products } from "@/db/schema";
import {
  purchaseItems,
  purchaseReceiptItems,
  purchaseReceipts,
  purchaseRequestItems,
  purchaseRequests,
  purchases,
  suppliers,
} from "@/db/purchases-schema";
import { adjustInventoryInTransaction } from "@/lib/inventory-transaction";
import { notifyInventoryState } from "@/lib/inventory";
import type {
  PurchaseInput,
  PurchaseRequestInput,
  ReceiptInput,
  SupplierInput,
} from "@/lib/purchases-validation";

type Actor = { userId: string | null; role?: string | null };
function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
function money(value: string | number) {
  return Number(Number(value).toFixed(2));
}
function audit(
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
  metadata?: Record<string, unknown>,
) {
  return {
    id: id("audit"),
    actorId: actor.userId,
    actorRole: actor.role ?? null,
    action,
    entityType,
    entityId,
    before: before as Record<string, unknown> | null,
    after: after as Record<string, unknown> | null,
    metadata: metadata ?? null,
  };
}

export async function findSupplierDuplicates(
  input: Pick<SupplierInput, "name" | "country" | "identification" | "email">,
) {
  const conditions = [
    input.identification ? eq(suppliers.identification, input.identification) : undefined,
    input.email ? eq(suppliers.email, input.email.toLowerCase()) : undefined,
    and(eq(suppliers.name, input.name), eq(suppliers.country, input.country)),
  ].filter(Boolean);
  if (!conditions.length) return [];
  return getDb()
    .select({
      id: suppliers.id,
      name: suppliers.name,
      country: suppliers.country,
      identification: suppliers.identification,
      email: suppliers.email,
    })
    .from(suppliers)
    .where(or(...(conditions as never[])))
    .limit(20);
}

export async function createSupplier(input: SupplierInput, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const exactConditions = [
      input.identification ? eq(suppliers.identification, input.identification) : undefined,
      input.email ? eq(suppliers.email, input.email.toLowerCase()) : undefined,
    ].filter(Boolean);
    const existing = exactConditions.length
      ? await tx
          .select({
            id: suppliers.id,
            identification: suppliers.identification,
            email: suppliers.email,
          })
          .from(suppliers)
          .where(or(...(exactConditions as never[])))
          .limit(1)
      : [];
    if (existing.length)
      throw new Error("Ya existe un proveedor con la misma identificación o correo.");
    const [created] = await tx
      .insert(suppliers)
      .values({ id: id("supplier"), ...input })
      .returning();
    await tx
      .insert(auditLogs)
      .values(audit(actor, "purchases.supplier_created", "supplier", created.id, null, created));
    return created;
  });
}
export async function updateSupplier(
  supplierId: string,
  input: Partial<SupplierInput>,
  actor: Actor,
  reason?: string,
) {
  return getDb().transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .for("update")
      .limit(1);
    if (!before) throw new Error("Proveedor no encontrado.");
    if (!reason?.trim()) throw new Error("La modificación del proveedor requiere un motivo.");
    const [after] = await tx
      .update(suppliers)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(suppliers.id, supplierId))
      .returning();
    await tx
      .insert(auditLogs)
      .values(
        audit(actor, "purchases.supplier_updated", "supplier", supplierId, before, after, {
          reason: reason.trim().slice(0, 500),
        }),
      );
    return after;
  });
}
export async function listSuppliers() {
  return getDb().select().from(suppliers).orderBy(suppliers.name).limit(500);
}
export async function listPurchases() {
  return getDb().select().from(purchases).orderBy(desc(purchases.createdAt)).limit(500);
}

export async function createPurchase(input: PurchaseInput, actor: Actor) {
  return getDb().transaction(async (tx) => {
    if (input.idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(purchases)
        .where(eq(purchases.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (existing) return { purchase: existing, itemCount: 0, idempotent: true };
    }
    const [supplier] = await tx
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, input.supplierId), eq(suppliers.status, "ACTIVE")))
      .limit(1);
    const [location] = await tx
      .select()
      .from(locations)
      .where(and(eq(locations.id, input.locationId), eq(locations.active, true)))
      .limit(1);
    const productsRows = await tx
      .select({
        id: products.id,
        sku: products.sku,
        name: products.commercialName,
        normalizedName: products.normalizedName,
      })
      .from(products)
      .where(
        inArray(
          products.id,
          input.items.map((item) => item.productId),
        ),
      );
    if (!supplier || !location) throw new Error("Proveedor o local no encontrado/activo.");
    if (supplier.currency !== input.currency)
      throw new Error("La moneda no coincide con la moneda del proveedor.");
    if (productsRows.length !== input.items.length)
      throw new Error("Una o más referencias no existen en el catálogo.");
    const productById = new Map(productsRows.map((product) => [product.id, product]));
    const subtotal = input.items
      .reduce((sum, item) => sum + money(item.unitCost) * item.quantity, 0)
      .toFixed(2);
    const now = new Date();
    const purchaseId = id("purchase");
    const code = `OC-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const status = input.createAs === "DRAFT" ? "DRAFT" : "PENDING";
    const [purchase] = await tx
      .insert(purchases)
      .values({
        id: purchaseId,
        code,
        supplierId: supplier.id,
        locationId: location.id,
        status,
        currency: input.currency,
        subtotal,
        notes: input.notes,
        requestId: input.requestId ?? null,
        issuedAt: status === "PENDING" ? now : null,
        expectedDeliveryAt: input.expectedDeliveryAt ? new Date(input.expectedDeliveryAt) : null,
        createdBy: actor.userId,
        idempotencyKey: input.idempotencyKey ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx.insert(purchaseItems).values(
      input.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product) throw new Error("Producto no encontrado.");
        return {
          id: id("purchase-item"),
          purchaseId,
          productId: product.id,
          skuSnapshot: product.sku,
          productNameSnapshot: product.name || product.normalizedName,
          quantityOrdered: item.quantity,
          quantityReceived: 0,
          unitCost: item.unitCost,
          currency: input.currency,
        };
      }),
    );
    await tx
      .insert(auditLogs)
      .values(
        audit(actor, "purchases.purchase_created", "purchase", purchase.id, null, purchase, {
          itemCount: input.items.length,
          locationId: location.id,
        }),
      );
    return { purchase, itemCount: input.items.length, idempotent: false };
  });
}

export async function issuePurchase(purchaseId: string, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .for("update")
      .limit(1);
    if (!before) throw new Error("Compra no encontrada.");
    if (before.status !== "DRAFT") throw new Error("Solo un borrador puede emitirse como OC.");
    const now = new Date();
    const [after] = await tx
      .update(purchases)
      .set({ status: "PENDING", issuedAt: now, updatedAt: now })
      .where(eq(purchases.id, purchaseId))
      .returning();
    await tx
      .insert(auditLogs)
      .values(
        audit(
          actor,
          "purchases.purchase_issued",
          "purchase",
          purchaseId,
          { status: before.status },
          { status: after.status, issuedAt: after.issuedAt },
        ),
      );
    return after;
  });
}

export async function cancelPurchase(purchaseId: string, reason: string, actor: Actor) {
  const cleanReason = reason.trim().slice(0, 500);
  if (!cleanReason) throw new Error("Cancelar una compra requiere un motivo.");
  return getDb().transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .for("update")
      .limit(1);
    if (!before) throw new Error("Compra no encontrada.");
    if (before.status === "RECEIVED" || before.status === "CANCELLED")
      throw new Error("La compra ya no admite cancelación.");
    const [after] = await tx
      .update(purchases)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: actor.userId,
        cancellationReason: cleanReason,
        updatedAt: new Date(),
      })
      .where(eq(purchases.id, purchaseId))
      .returning();
    await tx
      .insert(auditLogs)
      .values(
        audit(
          actor,
          "purchases.purchase_cancelled",
          "purchase",
          purchaseId,
          { status: before.status, received: "preserved" },
          { status: after.status, cancellationReason: cleanReason },
        ),
      );
    return after;
  });
}

export async function createPurchaseRequest(input: PurchaseRequestInput, actor: Actor) {
  return getDb().transaction(async (tx) => {
    if (input.idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (existing) return { request: existing, itemCount: 0, idempotent: true };
    }
    const [location] = await tx
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, input.locationId), eq(locations.active, true)))
      .limit(1);
    if (!location) throw new Error("El local no existe o está inactivo.");
    const productRows = await tx
      .select({
        id: products.id,
        sku: products.sku,
        name: products.commercialName,
        normalizedName: products.normalizedName,
      })
      .from(products)
      .where(
        inArray(
          products.id,
          input.items.map((item) => item.productId),
        ),
      );
    if (productRows.length !== input.items.length)
      throw new Error("Una o más referencias no existen en el catálogo.");
    const productById = new Map(productRows.map((product) => [product.id, product]));
    const now = new Date();
    const requestId = id("purchase-request");
    const code = `SOL-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const [request] = await tx
      .insert(purchaseRequests)
      .values({
        id: requestId,
        code,
        requesterId: actor.userId,
        locationId: location.id,
        source: input.source ?? "MANUAL",
        status: "DRAFT",
        notes: input.notes,
        idempotencyKey: input.idempotencyKey ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx.insert(purchaseRequestItems).values(
      input.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product) throw new Error("Producto no encontrado.");
        return {
          id: id("purchase-request-item"),
          requestId,
          productId: product.id,
          skuSnapshot: product.sku,
          productNameSnapshot: product.name || product.normalizedName || product.sku,
          quantityRequested: item.quantity,
          notes: item.notes,
        };
      }),
    );
    await tx
      .insert(auditLogs)
      .values(
        audit(actor, "purchases.request_created", "purchase_request", request.id, null, request, {
          itemCount: input.items.length,
        }),
      );
    return { request, itemCount: input.items.length, idempotent: false };
  });
}

export async function transitionPurchaseRequest(
  requestId: string,
  nextStatus: "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED",
  actor: Actor,
  reason?: string,
) {
  return getDb().transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, requestId))
      .for("update")
      .limit(1);
    if (!before) throw new Error("Solicitud de compra no encontrada.");
    const allowed: Record<string, string[]> = {
      DRAFT: ["SUBMITTED", "CANCELLED"],
      SUBMITTED: ["APPROVED", "REJECTED", "CANCELLED"],
      APPROVED: ["CANCELLED"],
      REJECTED: [],
      CONVERTED: [],
      CANCELLED: [],
    };
    if (!allowed[before.status]?.includes(nextStatus))
      throw new Error(`No se puede pasar de ${before.status} a ${nextStatus}.`);
    const cleanReason = reason?.trim().slice(0, 500) || null;
    if (nextStatus === "REJECTED" && !cleanReason)
      throw new Error("Rechazar una solicitud requiere un motivo.");
    const now = new Date();
    const [after] = await tx
      .update(purchaseRequests)
      .set({
        status: nextStatus,
        rejectionReason: nextStatus === "REJECTED" ? cleanReason : null,
        approvedBy: nextStatus === "APPROVED" ? actor.userId : before.approvedBy,
        approvedAt: nextStatus === "APPROVED" ? now : before.approvedAt,
        updatedAt: now,
      })
      .where(eq(purchaseRequests.id, requestId))
      .returning();
    await tx
      .insert(auditLogs)
      .values(
        audit(
          actor,
          `purchases.request_${nextStatus.toLowerCase()}`,
          "purchase_request",
          requestId,
          { status: before.status },
          { status: after.status, reason: cleanReason },
        ),
      );
    return after;
  });
}

export async function convertPurchaseRequest(
  requestId: string,
  input: Omit<PurchaseInput, "requestId">,
  actor: Actor,
) {
  return getDb().transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, requestId))
      .for("update")
      .limit(1);
    if (!request) throw new Error("Solicitud de compra no encontrada.");
    if (request.status === "CONVERTED" && request.convertedPurchaseId) {
      const [existing] = await tx
        .select()
        .from(purchases)
        .where(eq(purchases.id, request.convertedPurchaseId))
        .limit(1);
      if (existing) return { purchase: existing, request, idempotent: true };
    }
    if (request.status !== "APPROVED")
      throw new Error("Solo una solicitud aprobada puede convertirse en OC.");
    if (request.locationId !== input.locationId)
      throw new Error("El local de la OC debe coincidir con la solicitud.");
    if (input.idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(purchases)
        .where(eq(purchases.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (existing) return { purchase: existing, request, idempotent: true };
    }
    const [supplier] = await tx
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, input.supplierId), eq(suppliers.status, "ACTIVE")))
      .limit(1);
    if (!supplier) throw new Error("Proveedor no encontrado o inactivo.");
    if (supplier.currency !== input.currency)
      throw new Error("La moneda no coincide con la moneda del proveedor.");
    const requestLines = await tx
      .select()
      .from(purchaseRequestItems)
      .where(eq(purchaseRequestItems.requestId, requestId));
    const requestByProduct = new Map(requestLines.map((line) => [line.productId, line]));
    if (
      input.items.length !== requestLines.length ||
      input.items.some(
        (item) =>
          !requestByProduct.has(item.productId) ||
          item.quantity < (requestByProduct.get(item.productId)?.quantityRequested ?? 0),
      )
    )
      throw new Error("La OC debe contener las líneas aprobadas de la solicitud.");
    const subtotal = input.items
      .reduce((sum, item) => sum + money(item.unitCost) * item.quantity, 0)
      .toFixed(2);
    const now = new Date();
    const purchaseId = id("purchase");
    const code = `OC-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const [purchase] = await tx
      .insert(purchases)
      .values({
        id: purchaseId,
        code,
        supplierId: supplier.id,
        locationId: input.locationId,
        requestId,
        status: "PENDING",
        currency: input.currency,
        subtotal,
        notes: input.notes,
        issuedAt: now,
        expectedDeliveryAt: input.expectedDeliveryAt ? new Date(input.expectedDeliveryAt) : null,
        createdBy: actor.userId,
        idempotencyKey: input.idempotencyKey ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx.insert(purchaseItems).values(
      input.items.map((item) => {
        const line = requestByProduct.get(item.productId);
        if (!line) throw new Error("Producto no encontrado en la solicitud.");
        return {
          id: id("purchase-item"),
          purchaseId,
          productId: item.productId,
          skuSnapshot: line.skuSnapshot,
          productNameSnapshot: line.productNameSnapshot,
          quantityOrdered: item.quantity,
          quantityReceived: 0,
          unitCost: item.unitCost,
          currency: input.currency,
        };
      }),
    );
    const [updatedRequest] = await tx
      .update(purchaseRequests)
      .set({ status: "CONVERTED", convertedPurchaseId: purchase.id, updatedAt: now })
      .where(eq(purchaseRequests.id, requestId))
      .returning();
    await tx
      .insert(auditLogs)
      .values(
        audit(
          actor,
          "purchases.request_converted",
          "purchase_request",
          requestId,
          { status: request.status },
          { status: updatedRequest.status, purchaseId: purchase.id },
        ),
      );
    return { purchase, request: updatedRequest, idempotent: false };
  });
}

export async function receivePurchase(input: ReceiptInput, actor: Actor) {
  const result = await getDb().transaction(async (tx) => {
    if (input.idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(purchaseReceipts)
        .where(eq(purchaseReceipts.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (existing)
        return {
          receipt: existing,
          purchase: null,
          productIds: [],
          locationId: null,
          idempotent: true,
        };
    }
    const [purchase] = await tx
      .select()
      .from(purchases)
      .where(eq(purchases.id, input.purchaseId))
      .for("update")
      .limit(1);
    if (!purchase || purchase.status === "CANCELLED" || purchase.status === "RECEIVED")
      throw new Error("La compra no admite una nueva recepción.");
    const purchaseLines = await tx
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchase.id))
      .for("update");
    const lineByProduct = new Map(purchaseLines.map((line) => [line.productId, line]));
    if (input.items.some((item) => !lineByProduct.has(item.productId)))
      throw new Error("La recepción contiene un producto que no pertenece a la compra.");
    const remaining = input.items.map((item) => {
      const line = lineByProduct.get(item.productId);
      if (!line || line.quantityReceived + item.quantity > line.quantityOrdered)
        throw new Error(
          `La recepción supera la cantidad pendiente de ${line?.skuSnapshot ?? item.productId}.`,
        );
      return { item, line };
    });
    const now = new Date();
    const receiptId = id("purchase-receipt");
    const code = `REC-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const [receipt] = await tx
      .insert(purchaseReceipts)
      .values({
        id: receiptId,
        code,
        purchaseId: purchase.id,
        locationId: purchase.locationId,
        status: "POSTED",
        receivedBy: actor.userId,
        notes: null,
        idempotencyKey: input.idempotencyKey ?? null,
      })
      .returning();
    await tx
      .insert(purchaseReceiptItems)
      .values(
        remaining.map(({ item, line }) => ({
          id: id("purchase-receipt-item"),
          receiptId,
          purchaseItemId: line.id,
          productId: line.productId,
          quantity: item.quantity,
          unitCost: line.unitCost,
          currency: line.currency,
        })),
      );
    for (const { item, line } of remaining)
      await adjustInventoryInTransaction(tx, {
        productId: line.productId,
        locationId: purchase.locationId,
        quantity: item.quantity,
        type: "PURCHASE_RECEIPT",
        reason: "Recepción de orden de compra",
        referenceType: "purchase_receipt",
        referenceId: receipt.id,
        performedBy: actor.userId ?? undefined,
        performedByRole: actor.role ?? undefined,
      });
    for (const { item, line } of remaining)
      await tx
        .update(purchaseItems)
        .set({ quantityReceived: line.quantityReceived + item.quantity })
        .where(eq(purchaseItems.id, line.id));
    const updatedLines = await tx
      .select({
        quantityOrdered: purchaseItems.quantityOrdered,
        quantityReceived: purchaseItems.quantityReceived,
      })
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchase.id));
    const nextStatus = updatedLines.every((line) => line.quantityReceived >= line.quantityOrdered)
      ? "RECEIVED"
      : "PARTIAL_RECEIVED";
    const [updatedPurchase] = await tx
      .update(purchases)
      .set({ status: nextStatus, updatedAt: now })
      .where(eq(purchases.id, purchase.id))
      .returning();
    await tx
      .insert(auditLogs)
      .values(
        audit(
          actor,
          "purchases.receipt_posted",
          "purchase_receipt",
          receipt.id,
          { purchaseStatus: purchase.status },
          { receipt, purchaseStatus: nextStatus },
          {
            purchaseId: purchase.id,
            itemCount: remaining.length,
            kardexMovementType: "PURCHASE_RECEIPT",
          },
        ),
      );
    return {
      receipt,
      purchase: updatedPurchase,
      productIds: remaining.map(({ line }) => line.productId),
      locationId: purchase.locationId,
      idempotent: false,
    };
  });
  if (!result.idempotent && result.locationId)
    for (const productId of result.productIds) {
      try {
        await notifyInventoryState(productId, result.locationId);
      } catch (error) {
        console.error("ColdPower: no se pudo notificar el stock recibido", error);
      }
    }
  return result;
}
