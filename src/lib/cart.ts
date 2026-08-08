export type CartItem = {
  productId: string;
  quantity: number;
};

export type ResolvedCartItem = CartItem & {
  name: string;
  sku: string;
  price?: number;
};

const maximumQuantity = 99;

export function addCartItem(cart: CartItem[], productId: string, quantity = 1): CartItem[] {
  const cleanProductId = productId.trim();
  const cleanQuantity = normalizeQuantity(quantity);

  if (!cleanProductId || cleanQuantity <= 0) {
    return cart;
  }

  const existing = cart.find((item) => item.productId === cleanProductId);
  if (!existing) {
    return [...cart, { productId: cleanProductId, quantity: cleanQuantity }];
  }

  return cart.map((item) =>
    item.productId === cleanProductId
      ? { ...item, quantity: normalizeQuantity(item.quantity + cleanQuantity) }
      : item,
  );
}

export function updateCartItemQuantity(
  cart: CartItem[],
  productId: string,
  quantity: number,
): CartItem[] {
  const cleanProductId = productId.trim();
  const cleanQuantity = normalizeQuantity(quantity);

  if (!cleanProductId || cleanQuantity <= 0) {
    return removeCartItem(cart, cleanProductId);
  }

  return cart.map((item) =>
    item.productId === cleanProductId ? { ...item, quantity: cleanQuantity } : item,
  );
}

export function removeCartItem(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter((item) => item.productId !== productId);
}

export function getCartTotalQuantity(cart: CartItem[]) {
  return cart.reduce((total, item) => total + normalizeQuantity(item.quantity), 0);
}

export function parseStoredCart(value: string | null): CartItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const productId = typeof item.productId === "string" ? item.productId.trim() : "";
      const quantity = normalizeQuantity(Number(item.quantity));
      return productId && quantity > 0 ? [{ productId, quantity }] : [];
    });
  } catch {
    return [];
  }
}

export function serializeCart(cart: CartItem[]) {
  return JSON.stringify(cart.filter((item) => item.productId && item.quantity > 0));
}

export function buildCartQuoteMessage(items: ResolvedCartItem[]) {
  const lines = items.map((item) => {
    const sku = item.sku ? ` · SKU: ${item.sku}` : "";
    return `- ${item.quantity} x ${item.name}${sku}`;
  });

  return [
    "Hola ColdPower, deseo cotizar los productos de mi carrito:",
    ...lines,
    "Por favor confirmar compatibilidad, stock y precio final.",
  ].join("\n");
}

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) {
    return 0;
  }

  return Math.min(maximumQuantity, Math.max(0, Math.floor(quantity)));
}
