import { inventoryMovementTypes, type InventoryMovementType } from "@/lib/inventory-types";
import type { InventoryStatus } from "@/lib/inventory-domain";

export const inventoryPageSizes = [10, 25, 50, 100] as const;
export type InventoryPageSize = (typeof inventoryPageSizes)[number];

export const inventoryStatuses = [
  "SIN_SALDO",
  "SIN_MINIMO",
  "AGOTADO",
  "CRITICO",
  "BAJO",
  "OPTIMO",
  "RESERVADO",
] as const;
export type InventoryAdminStatus = InventoryStatus | "RESERVADO";

export const inventoryMovementLabels: Record<InventoryMovementType, string> = {
  OPENING_BALANCE: "Saldo inicial",
  PURCHASE_RECEIPT: "Recepción de compra",
  SALE: "Venta",
  ADJUSTMENT_IN: "Ajuste de entrada",
  ADJUSTMENT_OUT: "Ajuste de salida",
  TRANSFER_OUT: "Salida por traslado",
  TRANSFER_IN: "Entrada por traslado",
  RETURN_IN: "Devolución recibida",
  RETURN_OUT: "Devolución enviada",
  RESERVATION: "Reserva",
  RESERVATION_RELEASE: "Liberación de reserva",
};

export type InventoryAdminFilters = {
  query?: string;
  locationId?: string;
  categoryId?: string;
  familyId?: string;
  brandId?: string;
  status?: InventoryAdminStatus;
  hasReservations?: boolean;
  hasMinimum?: boolean;
  minAvailable?: number;
  updatedFrom?: string;
  updatedTo?: string;
  page?: number;
  pageSize?: InventoryPageSize;
};

export type InventoryKardexFilters = {
  productId: string;
  locationId: string;
  type?: InventoryMovementType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type InventoryMovementsFilters = {
  productId?: string;
  locationId?: string;
  type?: InventoryMovementType;
  actorQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

function parsePositiveInteger(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error("INVENTORY_INVALID_FILTER");
  return parsed;
}

function parseNonNegativeInteger(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error("INVENTORY_INVALID_FILTER");
  return parsed;
}

function parseBoolean(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (!value) return undefined;
  if (value !== "true" && value !== "false") throw new Error("INVENTORY_INVALID_FILTER");
  return value === "true";
}

function parseDate(params: URLSearchParams, key: string) {
  const value = params.get(key) || undefined;
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("INVENTORY_INVALID_FILTER");
  return value;
}

export function parseInventoryFilters(params: URLSearchParams): InventoryAdminFilters {
  const page = parsePositiveInteger(params, "page");
  const requestedPageSize = parsePositiveInteger(params, "pageSize");
  if (requestedPageSize !== undefined && !inventoryPageSizes.includes(requestedPageSize as InventoryPageSize)) {
    throw new Error("INVENTORY_INVALID_FILTER");
  }
  const status = params.get("status") || undefined;
  if (status && !inventoryStatuses.includes(status as InventoryAdminStatus)) throw new Error("INVENTORY_INVALID_FILTER");
  const updatedFrom = parseDate(params, "updatedFrom");
  const updatedTo = parseDate(params, "updatedTo");
  if (updatedFrom && updatedTo && updatedFrom > updatedTo) throw new Error("INVENTORY_INVALID_FILTER");
  return {
    query: params.get("query")?.trim() || undefined,
    locationId: params.get("locationId") || params.get("location") || undefined,
    categoryId: params.get("categoryId") || params.get("category") || undefined,
    familyId: params.get("familyId") || params.get("family") || undefined,
    brandId: params.get("brandId") || params.get("brand") || undefined,
    status: status as InventoryAdminStatus | undefined,
    hasReservations: parseBoolean(params, "hasReservations"),
    hasMinimum: parseBoolean(params, "hasMinimum"),
    minAvailable: parseNonNegativeInteger(params, "minAvailable"),
    updatedFrom,
    updatedTo,
    page,
    pageSize: requestedPageSize as InventoryPageSize | undefined,
  };
}

export function parseKardexFilters(params: URLSearchParams): InventoryKardexFilters {
  const productId = params.get("productId");
  const locationId = params.get("locationId");
  const type = params.get("type") || undefined;
  if (!productId || !locationId || (type && !inventoryMovementTypes.includes(type as InventoryMovementType))) {
    throw new Error("INVENTORY_INVALID_FILTER");
  }
  return {
    productId,
    locationId,
    type: type as InventoryMovementType | undefined,
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    page: parsePositiveInteger(params, "page"),
    pageSize: parsePositiveInteger(params, "pageSize"),
  };
}

export function parseInventoryMovementsFilters(params: URLSearchParams): InventoryMovementsFilters {
  const type = params.get("type") || undefined;
  if (type && !inventoryMovementTypes.includes(type as InventoryMovementType)) throw new Error("INVENTORY_INVALID_FILTER");
  const dateFrom = parseDate(params, "dateFrom");
  const dateTo = parseDate(params, "dateTo");
  if (dateFrom && dateTo && dateFrom > dateTo) throw new Error("INVENTORY_INVALID_FILTER");
  return {
    productId: params.get("productId") || undefined,
    locationId: params.get("locationId") || undefined,
    type: type as InventoryMovementType | undefined,
    actorQuery: params.get("actor")?.trim() || undefined,
    dateFrom,
    dateTo,
    page: parsePositiveInteger(params, "page"),
    pageSize: parsePositiveInteger(params, "pageSize"),
  };
}

export const inventoryStatusLabels: Record<InventoryAdminStatus, string> = {
  SIN_SALDO: "Sin saldo",
  SIN_MINIMO: "Sin mínimo",
  AGOTADO: "Agotado",
  CRITICO: "Crítico",
  BAJO: "Stock bajo",
  OPTIMO: "Óptimo",
  RESERVADO: "Reservado",
};
