import { cartError, cartResponse, getCartContext } from "@/lib/shopping-cart-http";
import { setCartItem } from "@/lib/shopping-cart-service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ productId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const context = await getCartContext();
  const { productId } = await params;
  let body: { quantity?: unknown };
  try {
    body = await request.json();
  } catch {
    return cartResponse(context, { success: false, message: "La cantidad debe enviarse como JSON." }, { status: 400 });
  }
  try {
    const cart = await setCartItem(context, decodeURIComponent(productId), Number(body.quantity), "set");
    return cartResponse(context, { success: true, cart });
  } catch (error) {
    return cartError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const context = await getCartContext();
  const { productId } = await params;
  try {
    const cart = await setCartItem(context, decodeURIComponent(productId), 0, "set");
    return cartResponse(context, { success: true, cart });
  } catch (error) {
    return cartError(error);
  }
}
