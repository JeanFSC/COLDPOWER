import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getPurchasesPage } from "@/lib/purchases-repository";
import { PurchasesInvalidFilterError, parsePurchasesFilters } from "@/lib/purchases-contract";
import { createPurchase } from "@/lib/purchases-service";
import { validatePurchaseInput } from "@/lib/purchases-validation";

export async function GET(request: Request) { try { await requireApiPermission("purchases.view"); return apiSuccess(await getPurchasesPage(parsePurchasesFilters(new URL(request.url).searchParams))); } catch(error) { if(error instanceof ApiAuthorizationError)return apiError("PURCHASES_FORBIDDEN","No tienes permiso para ver compras.",403); if(error instanceof PurchasesInvalidFilterError)return apiError("PURCHASES_INVALID_FILTER","Los filtros de compras no son válidos.",400); return apiError("PURCHASES_UNAVAILABLE","No se pudieron cargar las compras.",503); } }
export async function POST(request: Request) {
  try { const actor = await requireApiPermission("purchases.manage"); let body: unknown; try { body = await request.json(); } catch { return apiError("INVALID_JSON","JSON inválido.",400); } const input=validatePurchaseInput(body); const header=request.headers.get("Idempotency-Key"); const result=await createPurchase({...input,idempotencyKey:header??input.idempotencyKey},actor); return apiSuccess({result},result.idempotent?200:201); } catch(error) { if(error instanceof ApiAuthorizationError)return apiError("PURCHASES_FORBIDDEN","No tienes permiso para crear compras.",403); return apiError("PURCHASE_NOT_CREATED",error instanceof Error?error.message:"No se pudo crear la compra.",400); }
}
