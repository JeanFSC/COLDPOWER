import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getOrdersPage } from "@/lib/orders-repository";
import { OrdersInvalidFilterError, parseOrdersFilters } from "@/lib/orders-contract";
import { apiError, apiSuccess } from "@/lib/api-errors";

export async function GET(request: Request) { try { await requireApiPermission("orders.view"); return apiSuccess(await getOrdersPage(parseOrdersFilters(new URL(request.url).searchParams))); } catch(error) { if(error instanceof ApiAuthorizationError)return apiError("ORDERS_FORBIDDEN","No tienes permiso para ver pedidos.",403); if(error instanceof OrdersInvalidFilterError)return apiError("ORDERS_INVALID_FILTER","Los filtros de pedidos no son válidos.",400); return apiError("ORDERS_UNAVAILABLE","No se pudieron cargar los pedidos.",503); } }
