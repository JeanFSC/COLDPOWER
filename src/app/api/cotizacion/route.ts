import { eq, inArray, or } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAuthConfigured, quoteConfig } from "@/lib/env";
import { checkQuoteRateLimit, generateQuoteId, validateQuotePayload } from "@/lib/quote";
import { getDb } from "@/db";
import { products, quoteCarts, quoteItems, quoteStatusHistory, quotes } from "@/db/schema";
import { ensureLeadFromQuoteInTransaction } from "@/lib/crm-service";
import { notifyStaffOnce } from "@/lib/notifications-service";

const maxPayloadBytes = 8 * 1024;
const rateLimitMessage = "Recibimos varias solicitudes. Intenta nuevamente en unos minutos o escríbenos por WhatsApp.";
const sessionCookieName = "coldpower-quote-session";

export async function GET() {
  return NextResponse.json({ success: false, message: "Método no permitido. Usa POST para registrar una solicitud de cotización." }, { status: 405, headers: { Allow: "POST" } });
}

export async function POST(request: Request) {
  const payloadSize = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(payloadSize) && payloadSize > maxPayloadBytes) return NextResponse.json({ success: false, message: "La solicitud es demasiado grande. Reduce el mensaje e intenta nuevamente." }, { status: 413 });
  const clientIp = getClientIp(request);
  const rateLimit = checkQuoteRateLimit(clientIp);
  if (!rateLimit.allowed) return NextResponse.json({ success: false, message: rateLimitMessage, retryAfterMs: rateLimit.retryAfterMs }, { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)), "X-RateLimit-Limit": String(rateLimit.limit), "X-RateLimit-Remaining": "0" } });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: "No se pudo leer la solicitud. Revisa los datos enviados.", errors: { message: "La solicitud debe enviarse en formato JSON." } }, { status: 400 }); }
  const validation = validateQuotePayload(body);
  if (!validation.ok) return NextResponse.json({ success: false, message: "Corrige los campos marcados antes de registrar la solicitud.", errors: validation.errors }, { status: 400 });
  const receivedAt = new Date();
  const quoteId = generateQuoteId(receivedAt);
  if (quoteConfig.enableApiLog) console.info("ColdPower quote request received", { quoteId, receivedAt: receivedAt.toISOString() });
  const userId = isAuthConfigured ? (await auth()).userId : null;
  const sessionToken = (await cookies()).get(sessionCookieName)?.value ?? null;
  try {
    const db = getDb();
    const lead = await db.transaction(async (tx) => {
      await tx.insert(quotes).values({ id: quoteId, trackingCode: quoteId, userId: userId ?? null, name: validation.data.name, customerType: validation.data.customerType, documentNumber: validation.data.documentNumber, phone: validation.data.phone, email: validation.data.email || null, department: validation.data.department, province: validation.data.province, district: validation.data.district, preferredContact: validation.data.preferredContact, consentAt: validation.data.consent ? receivedAt : null, productSlug: validation.data.productSlug || null, productName: validation.data.productName || null, sku: validation.data.sku || null, message: validation.data.message, status: "borrador", workflowStatus: "DRAFT", origin: "WEB", clientIp, createdAt: receivedAt });
      await tx.insert(quoteStatusHistory).values({ id: `qsh-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`, quoteId, fromStatus: null, toStatus: "borrador", changedBy: userId ?? "anonymous", note: "Solicitud web recibida como borrador" });
      const requestedQuantities = new Map<string, number>();
      // quote_carts is only the quote list ("Lista de cotización"); the purchase cart lives in
      // shopping_carts and is never read here. The list is emptied once it becomes a quote.
      if (sessionToken) { const [cart] = await tx.select({ items: quoteCarts.items, expiresAt: quoteCarts.expiresAt }).from(quoteCarts).where(eq(quoteCarts.id, sessionToken)).limit(1); if (cart && cart.expiresAt.getTime() > Date.now()) for (const item of cart.items) addQuantity(requestedQuantities, item.productId, item.quantity); if (cart) await tx.update(quoteCarts).set({ items: [], updatedAt: new Date() }).where(eq(quoteCarts.id, sessionToken)); }
      const directConditions = [...(validation.data.productSlug ? [eq(products.slug, validation.data.productSlug)] : []), ...(validation.data.sku ? [eq(products.sku, validation.data.sku)] : [])];
      if (directConditions.length > 0) { const [directProduct] = await tx.select({ id: products.id }).from(products).where(or(...directConditions)); if (directProduct) addQuantity(requestedQuantities, directProduct.id, 1); }
      const productIds = [...requestedQuantities.keys()];
       if (productIds.length > 0) { const sourceProducts = await tx.select({ id: products.id, sku: products.sku, name: products.normalizedName }).from(products).where(inArray(products.id, productIds)); const sourceById = new Map(sourceProducts.map((product) => [product.id, product])); const snapshots = productIds.flatMap((productId) => { const product = sourceById.get(productId); return product ? [{ id: `qi-${crypto.randomUUID()}`, quoteId, productId: product.id, skuSnapshot: product.sku, productNameSnapshot: product.name, quantity: requestedQuantities.get(productId) ?? 1 }] : []; }); if (snapshots.length > 0) await tx.insert(quoteItems).values(snapshots); }
       return ensureLeadFromQuoteInTransaction(tx, quoteId, userId);
     });
     try { const recipientIds = lead.assignedSellerId ? [lead.assignedSellerId] : undefined; const notificationMetadata = { quoteId, opportunityId: lead.opportunityId, assigneeId: lead.assignedSellerId }; await notifyStaffOnce({ type: "QUOTE_CREATED", title: "Nueva solicitud de cotización", body: `La solicitud ${quoteId} requiere revisión comercial.`, link: `/admin/cotizaciones?quoteId=${encodeURIComponent(quoteId)}`, metadata: notificationMetadata, recipientIds, dedupeKey: `quote:${quoteId}:created` }); await notifyStaffOnce({ type: "LEAD_CREATED", title: "Nuevo lead comercial", body: `Se creó el lead asociado a la solicitud ${quoteId}.`, link: `/admin/crm?quoteId=${encodeURIComponent(quoteId)}`, metadata: notificationMetadata, recipientIds, dedupeKey: `quote:${quoteId}:lead` }); } catch (error) { console.error("ColdPower: no se pudo notificar la nueva cotización", error); }
  } catch (persistError) {
    console.error("ColdPower: fallo al persistir cotización o lead CRM", persistError);
    return NextResponse.json({ success: false, message: "No se pudo guardar la solicitud y su seguimiento comercial. Inténtalo nuevamente o continúa por WhatsApp." }, { status: 503, headers: { "X-RateLimit-Limit": String(rateLimit.limit), "X-RateLimit-Remaining": String(rateLimit.remaining) } });
  }
  return NextResponse.json({ success: true, message: "Solicitud registrada. Un asesor confirmará la cotización final.", quoteId, receivedAt: receivedAt.toISOString() }, { status: 201, headers: { "X-RateLimit-Limit": String(rateLimit.limit), "X-RateLimit-Remaining": String(rateLimit.remaining) } });
}

function addQuantity(target: Map<string, number>, productId: string, quantity: number) { const safeQuantity = Math.min(99, Math.max(1, Math.floor(Number(quantity) || 1))); target.set(productId, Math.min(99, (target.get(productId) ?? 0) + safeQuantity)); }
function getClientIp(request: Request) { const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(); return forwardedFor || request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "anonymous"; }
