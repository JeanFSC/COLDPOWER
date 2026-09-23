import { NextResponse, after } from "next/server";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { validateCartCheckoutInput } from "@/lib/sales-validation";
import { cancelExpiredUnpaidOrders, CheckoutDomainError, createCheckoutFromCart } from "@/lib/sales-service";
import { PaymentDomainError, startPaymentForOrder } from "@/lib/payment-service";

export const dynamic = "force-dynamic";

// Creates the order from the signed-in user's purchase cart and starts its payment. Items
// and prices are never taken from the request body.
export async function POST(request: Request) {
  let userId: string;
  try {
    ({ userId } = await requireApiUser());
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return NextResponse.json({ success: false, code: "AUTH_REQUIRED", message: "Inicia sesión para completar tu compra.", signInUrl: "/sign-in?redirect_url=%2Fcheckout" }, { status: 401 });
    throw error;
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: "JSON inválido." }, { status: 400 }); }

  let result;
  try {
    const input = validateCartCheckoutInput(body);
    result = await createCheckoutFromCart(userId, input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el pedido.";
    const status = error instanceof CheckoutDomainError ? error.status : /stock|precio|local|disponible|monedas|saldo/i.test(message) ? 409 : 400;
    return NextResponse.json({ success: false, code: error instanceof CheckoutDomainError ? error.code : "CHECKOUT_REJECTED", message }, { status });
  } finally {
    after(async () => {
      try { await cancelExpiredUnpaidOrders(); } catch (error) { console.error("ColdPower: barrido de pedidos vencidos falló", error); }
    });
  }

  const order = { code: result.order.code, status: result.order.status, total: result.order.total, currency: result.order.currency, paymentDueAt: result.order.paymentDueAt };
  try {
    const payment = await startPaymentForOrder(result.order.code, userId);
    return NextResponse.json({ success: true, order, paymentUrl: payment.checkoutUrl, idempotent: result.idempotent }, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    // The order exists and its stock is held: the customer can retry payment from the order page.
    const paymentError = error instanceof PaymentDomainError ? error.message : "No se pudo iniciar el pago.";
    if (!(error instanceof PaymentDomainError)) console.error("ColdPower: no se pudo iniciar el pago del pedido", error);
    return NextResponse.json({ success: true, order, paymentUrl: null, paymentError, idempotent: result.idempotent }, { status: result.idempotent ? 200 : 201 });
  }
}
