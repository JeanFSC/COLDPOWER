import { cartError, cartResponse, getCartContext } from "@/lib/shopping-cart-http";
import { clearCart, readCartView, setCartItem } from "@/lib/shopping-cart-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getCartContext();
  try {
    return cartResponse(context, { success: true, cart: await readCartView(context) });
  } catch (error) {
    return cartError(error);
  }
}

// Adds units of a product to the purchase cart. Quote-only products (no active retail
// price) are rejected with 409 PRODUCT_QUOTE_ONLY.
export async function POST(request: Request) {
  const context = await getCartContext();
  let body: { productId?: unknown; quantity?: unknown };
  try {
    body = await request.json();
  } catch {
    return cartResponse(context, { success: false, message: "El carrito debe enviarse como JSON." }, { status: 400 });
  }
  try {
    const productId = typeof body.productId === "string" ? body.productId.trim().slice(0, 160) : "";
    const quantity = body.quantity === undefined ? 1 : Number(body.quantity);
    const cart = await setCartItem(context, productId, quantity, "add");
    return cartResponse(context, { success: true, cart });
  } catch (error) {
    return cartError(error);
  }
}

export async function DELETE() {
  const context = await getCartContext();
  try {
    return cartResponse(context, { success: true, cart: await clearCart(context) });
  } catch (error) {
    return cartError(error);
  }
}
