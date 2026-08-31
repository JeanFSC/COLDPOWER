import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { receivePurchase } from "@/lib/purchases-service";
import { validateReceiptInput } from "@/lib/purchases-validation";

export async function POST(request: Request) {
  try { const actor = await requireApiPermission("purchases.receive"); let body: unknown; try { body = await request.json(); } catch { return apiError("INVALID_JSON","JSON inválido.",400); } const input=validateReceiptInput(body); const result=await receivePurchase({...input,idempotencyKey:request.headers.get("Idempotency-Key")??input.idempotencyKey},actor); return apiSuccess({result},result.idempotent?200:201); } catch(error) { if(error instanceof ApiAuthorizationError)return apiError("PURCHASES_RECEIVE_FORBIDDEN","No tienes permiso para recibir compras.",403); return apiError("PURCHASE_RECEIPT_FAILED",error instanceof Error?error.message:"No se pudo registrar la recepción.",400); }
}
