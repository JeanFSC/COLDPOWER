import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getDb } from "@/db";
import { eq } from "drizzle-orm";
import { suppliers } from "@/db/purchases-schema";
import { updateSupplier } from "@/lib/purchases-service";
import { validateSupplierInput } from "@/lib/purchases-validation";

export async function GET(_request: Request,{params}:{params:Promise<{id:string}>}){try{await requireApiPermission("purchases.view");const{id}=await params;const[row]=await getDb().select().from(suppliers).where(eq(suppliers.id,id)).limit(1);return row?apiSuccess({supplier:row}):apiError("SUPPLIER_NOT_FOUND","Proveedor no encontrado.",404)}catch(error){if(error instanceof ApiAuthorizationError)return apiError("SUPPLIERS_FORBIDDEN","No tienes permiso para ver proveedores.",403);return apiError("SUPPLIER_UNAVAILABLE","No se pudo cargar el proveedor.",503)}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await requireApiPermission("purchases.manage");const{id}=await params;let body:unknown;try{body=await request.json()}catch{return apiError("INVALID_JSON","JSON inválido.",400)}const raw=body&&typeof body==="object"?body as Record<string,unknown>:{};const input=validateSupplierInput(raw);const reason=typeof raw.reason==="string"?raw.reason:"";return apiSuccess({supplier:await updateSupplier(id,input,actor,reason)})}catch(error){if(error instanceof ApiAuthorizationError)return apiError("SUPPLIERS_FORBIDDEN","No tienes permiso para editar proveedores.",403);return apiError("SUPPLIER_NOT_UPDATED",error instanceof Error?error.message:"No se pudo actualizar el proveedor.",400)}}
