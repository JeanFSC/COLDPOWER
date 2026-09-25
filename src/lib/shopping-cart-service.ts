import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { shoppingCartItems, shoppingCarts } from "@/db/sales-schema";
import { getCatalogProductsByIds, publicConditions } from "@/lib/catalog-repository";
import { resolveProductImage } from "@/lib/product-image";
import { loadRetailPricesWithPromotions } from "@/lib/retail-price";
import { unconfiguredTaxBreakdown, type TaxBreakdown } from "@/lib/tax";

export const CART_SESSION_COOKIE = "coldpower-cart-session";
export const CART_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const MAX_CART_LINES = 50;
const MAX_LINE_QUANTITY = 999;

type Database = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type CartContext = { sessionToken: string; userId: string | null };

export class CartDomainError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
    this.name = "CartDomainError";
  }
}

export type CartLineView = {
  productId: string;
  slug: string | null;
  sku: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  family: string | null;
  taxType: string | null;
  image: string | null;
  quantity: number;
  unitPrice: string | null;
  currency: string | null;
  lineTotal: string | null;
  available: boolean;
  purchasable: boolean;
};

export type CartView = {
  cartId: string | null;
  version: number;
  items: CartLineView[];
  totalQuantity: number;
  subtotal: string | null;
  currency: string | null;
  canCheckout: boolean;
  issues: Array<"UNAVAILABLE_ITEMS" | "QUOTE_ONLY_ITEMS" | "MIXED_CURRENCY">;
  tax: TaxBreakdown;
};

const emptyView: CartView = { cartId: null, version: 0, items: [], totalQuantity: 0, subtotal: null, currency: null, canCheckout: false, issues: [], tax: unconfiguredTaxBreakdown() };

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function nextExpiry() {
  return new Date(Date.now() + CART_SESSION_TTL_MS);
}

async function mergeCartInto(tx: Transaction, fromCartId: string, toCartId: string) {
  const items = await tx.select().from(shoppingCartItems).where(eq(shoppingCartItems.cartId, fromCartId));
  for (const item of items) {
    await tx
      .insert(shoppingCartItems)
      .values({ id: newId("cart-item"), cartId: toCartId, productId: item.productId, quantity: item.quantity })
      .onConflictDoUpdate({
        target: [shoppingCartItems.cartId, shoppingCartItems.productId],
        set: { quantity: sql`least(${MAX_LINE_QUANTITY}, ${shoppingCartItems.quantity} + excluded.quantity)`, updatedAt: new Date() },
      });
  }
  await tx.update(shoppingCarts).set({ status: "MERGED", sessionToken: null, updatedAt: new Date() }).where(eq(shoppingCarts.id, fromCartId));
  await tx.update(shoppingCarts).set({ version: sql`${shoppingCarts.version} + 1`, expiresAt: nextExpiry(), updatedAt: new Date() }).where(eq(shoppingCarts.id, toCartId));
}

// Resolves (and optionally creates) the caller's single ACTIVE cart. When a signed-in user
// still has an anonymous browser cart, it is claimed or merged into their account cart so
// nothing added before signing in is lost.
async function resolveActiveCartId(tx: Transaction, context: CartContext, create: boolean) {
  const [sessionCart] = await tx
    .select()
    .from(shoppingCarts)
    .where(and(eq(shoppingCarts.sessionToken, context.sessionToken), eq(shoppingCarts.status, "ACTIVE")))
    .for("update")
    .limit(1);
  const anonymousSessionCart = sessionCart && !sessionCart.userId ? sessionCart : null;

  if (!context.userId) {
    if (anonymousSessionCart) return anonymousSessionCart.id;
    if (!create) return null;
    const [created] = await tx
      .insert(shoppingCarts)
      .values({ id: newId("cart"), sessionToken: context.sessionToken, userId: null, expiresAt: nextExpiry() })
      .returning({ id: shoppingCarts.id });
    return created.id;
  }

  const [userCart] = await tx
    .select()
    .from(shoppingCarts)
    .where(and(eq(shoppingCarts.userId, context.userId), eq(shoppingCarts.status, "ACTIVE")))
    .for("update")
    .limit(1);

  if (anonymousSessionCart) {
    if (!userCart) {
      await tx
        .update(shoppingCarts)
        .set({ userId: context.userId, sessionToken: null, version: sql`${shoppingCarts.version} + 1`, expiresAt: nextExpiry(), updatedAt: new Date() })
        .where(eq(shoppingCarts.id, anonymousSessionCart.id));
      return anonymousSessionCart.id;
    }
    await mergeCartInto(tx, anonymousSessionCart.id, userCart.id);
    return userCart.id;
  }

  if (userCart) return userCart.id;
  if (!create) return null;
  const [created] = await tx
    .insert(shoppingCarts)
    .values({ id: newId("cart"), sessionToken: null, userId: context.userId, expiresAt: nextExpiry() })
    .returning({ id: shoppingCarts.id });
  return created.id;
}

async function assertPurchasable(tx: Transaction, cartId: string | null, productId: string) {
  const [product] = await tx
    .select({ id: products.id, sku: products.sku })
    .from(products)
    .where(and(eq(products.id, productId), ...publicConditions()))
    .limit(1);
  if (!product) throw new CartDomainError("PRODUCT_NOT_AVAILABLE", "El producto ya no está disponible en el catálogo.", 404);
  const prices = await loadRetailPricesWithPromotions(tx, [productId]);
  const price = prices.get(productId);
  if (!price) throw new CartDomainError("PRODUCT_QUOTE_ONLY", `El producto ${product.sku} no tiene precio vigente; solicítalo por cotización.`, 409);
  if (!cartId) return;
  const otherItems = await tx.select({ productId: shoppingCartItems.productId }).from(shoppingCartItems).where(eq(shoppingCartItems.cartId, cartId));
  const otherIds = otherItems.map((item) => item.productId).filter((id) => id !== productId);
  if (!otherIds.length) return;
  const otherPrices = await loadRetailPricesWithPromotions(tx, otherIds);
  if ([...otherPrices.values()].some((other) => other.currency !== price.currency)) {
    throw new CartDomainError("MIXED_CURRENCY", "Este producto se vende en otra moneda. Completa primero la compra actual.", 409);
  }
}

export async function readCartView(context: CartContext): Promise<CartView> {
  const db = getDb();
  const cartId = await db.transaction((tx) => resolveActiveCartId(tx, context, false));
  if (!cartId) return emptyView;
  return buildCartView(db, cartId);
}

async function buildCartView(db: Database, cartId: string): Promise<CartView> {
  const [cart] = await db.select().from(shoppingCarts).where(eq(shoppingCarts.id, cartId)).limit(1);
  if (!cart) return emptyView;
  const rows = await db.select().from(shoppingCartItems).where(eq(shoppingCartItems.cartId, cartId)).orderBy(asc(shoppingCartItems.createdAt));
  if (!rows.length) return { ...emptyView, cartId, version: cart.version };
  const ids = rows.map((row) => row.productId);
  const [catalog, prices] = await Promise.all([getCatalogProductsByIds(ids), loadRetailPricesWithPromotions(db, ids)]);
  const productById = new Map(catalog.map((product) => [product.id, product]));
  const items: CartLineView[] = rows.map((row) => {
    const product = productById.get(row.productId);
    const price = product ? prices.get(row.productId) : undefined;
    return {
      productId: row.productId,
      slug: product?.slug ?? null,
      sku: product?.sku ?? null,
      name: product?.name ?? "Producto no disponible",
      brand: product?.brand ?? null,
      category: product?.category ?? null,
      family: product?.family ?? null,
      taxType: product?.taxType ?? null,
      image: product ? resolveProductImage(product).src : null,
      quantity: row.quantity,
      unitPrice: price?.amount ?? null,
      currency: price?.currency ?? null,
      lineTotal: price ? (Number(price.amount) * row.quantity).toFixed(2) : null,
      available: Boolean(product),
      purchasable: Boolean(product && price),
    };
  });
  const issues: CartView["issues"] = [];
  if (items.some((item) => !item.available)) issues.push("UNAVAILABLE_ITEMS");
  if (items.some((item) => item.available && !item.purchasable)) issues.push("QUOTE_ONLY_ITEMS");
  const currencies = new Set(items.filter((item) => item.currency).map((item) => item.currency));
  if (currencies.size > 1) issues.push("MIXED_CURRENCY");
  const canCheckout = issues.length === 0;
  const subtotal = canCheckout ? items.reduce((sum, item) => sum + Number(item.lineTotal ?? 0), 0).toFixed(2) : null;
  return {
    cartId,
    version: cart.version,
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    currency: currencies.size === 1 ? [...currencies][0] : null,
    canCheckout,
    issues,
    tax: unconfiguredTaxBreakdown(),
  };
}

export async function setCartItem(context: CartContext, productId: string, quantity: number, mode: "set" | "add" = "set") {
  if (!productId) throw new CartDomainError("PRODUCT_REQUIRED", "Falta el producto.");
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_LINE_QUANTITY) throw new CartDomainError("QUANTITY_INVALID", "La cantidad debe ser un entero entre 0 y 999.");
  const db = getDb();
  const cartId = await db.transaction(async (tx) => {
    const id = await resolveActiveCartId(tx, context, quantity > 0);
    if (!id) return null;
    if (quantity === 0 && mode === "set") {
      await tx.delete(shoppingCartItems).where(and(eq(shoppingCartItems.cartId, id), eq(shoppingCartItems.productId, productId)));
    } else {
      await assertPurchasable(tx, id, productId);
      const [existing] = await tx
        .select({ quantity: shoppingCartItems.quantity })
        .from(shoppingCartItems)
        .where(and(eq(shoppingCartItems.cartId, id), eq(shoppingCartItems.productId, productId)))
        .limit(1);
      if (!existing) {
        const [{ lines }] = await tx.select({ lines: sql<number>`count(*)::int` }).from(shoppingCartItems).where(eq(shoppingCartItems.cartId, id));
        if (lines >= MAX_CART_LINES) throw new CartDomainError("CART_FULL", `El carrito admite hasta ${MAX_CART_LINES} productos distintos.`, 409);
      }
      const nextQuantity = Math.min(MAX_LINE_QUANTITY, mode === "add" ? (existing?.quantity ?? 0) + quantity : quantity);
      if (nextQuantity <= 0) return id;
      await tx
        .insert(shoppingCartItems)
        .values({ id: newId("cart-item"), cartId: id, productId, quantity: nextQuantity })
        .onConflictDoUpdate({ target: [shoppingCartItems.cartId, shoppingCartItems.productId], set: { quantity: nextQuantity, updatedAt: new Date() } });
    }
    await tx.update(shoppingCarts).set({ version: sql`${shoppingCarts.version} + 1`, expiresAt: nextExpiry(), updatedAt: new Date() }).where(eq(shoppingCarts.id, id));
    return id;
  });
  return cartId ? buildCartView(db, cartId) : emptyView;
}

export async function clearCart(context: CartContext) {
  const db = getDb();
  const cartId = await db.transaction(async (tx) => {
    const id = await resolveActiveCartId(tx, context, false);
    if (!id) return null;
    await tx.delete(shoppingCartItems).where(eq(shoppingCartItems.cartId, id));
    await tx.update(shoppingCarts).set({ version: sql`${shoppingCarts.version} + 1`, updatedAt: new Date() }).where(eq(shoppingCarts.id, id));
    return id;
  });
  return cartId ? buildCartView(db, cartId) : emptyView;
}

// Used by checkout inside its own transaction: locks the user's ACTIVE cart so the same
// cart version can only ever turn into one order.
export async function lockCartForCheckout(tx: Transaction, userId: string) {
  const [cart] = await tx
    .select()
    .from(shoppingCarts)
    .where(and(eq(shoppingCarts.userId, userId), eq(shoppingCarts.status, "ACTIVE")))
    .for("update")
    .limit(1);
  if (!cart) return null;
  const items = await tx
    .select({ productId: shoppingCartItems.productId, quantity: shoppingCartItems.quantity })
    .from(shoppingCartItems)
    .where(eq(shoppingCartItems.cartId, cart.id))
    .orderBy(asc(shoppingCartItems.createdAt));
  return { cart, items };
}

export async function markCartConverted(tx: Transaction, cartId: string) {
  await tx.update(shoppingCarts).set({ status: "CONVERTED", sessionToken: null, updatedAt: new Date() }).where(eq(shoppingCarts.id, cartId));
}
