import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAuthConfigured } from "@/lib/env";
import { validateCheckoutInput } from "@/lib/sales-validation";
import { createCheckoutOrder } from "@/lib/sales-service";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  try {
    const input = validateCheckoutInput(body);
    const userId = isAuthConfigured ? (await auth()).userId : null;
    const result = await createCheckoutOrder(input, { userId, role: null });
    return NextResponse.json({ success: true, order: result.order, idempotent: result.idempotent }, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el pedido.";
    const status = /stock|precio|local|disponible|monedas|checkout/i.test(message) ? 409 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
