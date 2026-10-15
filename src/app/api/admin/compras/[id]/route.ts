import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getPurchaseDetail } from "@/lib/purchases-repository";
import { cancelPurchase, issuePurchase } from "@/lib/purchases-service";
import { revalidatePath } from "next/cache";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await requireApiPermission("purchases.view");const{id}=await params;const detail=await getPurchaseDetail(id);if(!detail)return apiError("PURCHASE_NOT_FOUND","Compra no encontrada.",404);if(can(actor.role,"purchases.cost.view"))return apiSuccess(detail);return apiSuccess({...detail,purchase:{...detail.purchase,subtotal:""},items:detail.items.map(item=>({...item,unitCost:""}))})}catch(error){if(error instanceof ApiAuthorizationError)return apiError("PURCHASES_FORBIDDEN","No tienes permiso para ver compras.",403);return apiError("PURCHASE_DETAIL_UNAVAILABLE","No se pudo cargar la compra.",503)}}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("purchases.manage");
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const id = (await params).id;
    if (action !== "issue" && action !== "cancel") {
      return apiError("PURCHASE_ACTION_INVALID", "Acción de compra no válida.", 400);
    }
    const purchase = action === "issue"
      ? await issuePurchase(id, actor)
      : await cancelPurchase(id, typeof body.reason === "string" ? body.reason : "", actor);
    revalidatePath("/admin/compras");
    return apiSuccess({ purchase });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PURCHASES_FORBIDDEN", "No tienes permiso para modificar compras.", 403);
    return apiError("PURCHASE_ACTION_FAILED", error instanceof Error ? error.message : "No se pudo modificar la compra.", 400);
  }
}
