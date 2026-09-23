import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/auth";
import { CART_SESSION_COOKIE, CART_SESSION_TTL_MS, CartDomainError, type CartContext } from "@/lib/shopping-cart-service";

export async function getCartContext(): Promise<CartContext> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CART_SESSION_COOKIE)?.value || crypto.randomUUID();
  return { sessionToken, userId: await getOptionalUserId() };
}

export function cartResponse(context: CartContext, body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.cookies.set({
    name: CART_SESSION_COOKIE,
    value: context.sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_SESSION_TTL_MS / 1000,
    path: "/",
  });
  return response;
}

export function cartError(error: unknown) {
  if (error instanceof CartDomainError) {
    return NextResponse.json({ success: false, code: error.code, message: error.message }, { status: error.status });
  }
  console.error("ColdPower: operación de carrito de compra no persistida", error);
  return NextResponse.json({ success: false, code: "CART_UNAVAILABLE", message: "No se pudo guardar el carrito. Inténtalo nuevamente." }, { status: 503 });
}
