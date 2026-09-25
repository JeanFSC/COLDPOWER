import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import {
  OrdersInvalidFilterError,
  parseOrdersFilters,
} from "@/lib/orders-contract";
import { getOrdersPage } from "@/lib/orders-repository";
import { can } from "@/lib/roles";

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("orders.view");
    const canViewAmounts =
      can(actor.role, "sales.view") || can(actor.role, "payments.view");

    const page = await getOrdersPage(
      parseOrdersFilters(new URL(request.url).searchParams),
      {
        includeAmounts: canViewAmounts,
        includeFinancial: can(actor.role, "payments.view"),
      },
    );

    return apiSuccess(page);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) {
      return apiError(
        "ORDERS_FORBIDDEN",
        "No tienes permiso para ver pedidos.",
        403,
      );
    }

    if (error instanceof OrdersInvalidFilterError) {
      return apiError(
        "ORDERS_INVALID_FILTER",
        "Los filtros de pedidos no son válidos.",
        400,
      );
    }

    return apiError(
      "ORDERS_UNAVAILABLE",
      "No se pudieron cargar los pedidos.",
      503,
    );
  }
}
