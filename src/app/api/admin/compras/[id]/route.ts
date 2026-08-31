import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getPurchaseDetail } from "@/lib/purchases-repository";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{await requireApiPermission("purchases.view");const{id}=await params;const detail=await getPurchaseDetail(id);return detail?apiSuccess(detail):apiError("PURCHASE_NOT_FOUND","Compra no encontrada.",404)}catch(error){if(error instanceof ApiAuthorizationError)return apiError("PURCHASES_FORBIDDEN","No tienes permiso para ver compras.",403);return apiError("PURCHASE_DETAIL_UNAVAILABLE","No se pudo cargar la compra.",503)}}
