import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  brands,
  categories,
  families,
  inventoryBalances,
  inventoryImportBatches,
  inventoryMovements,
  inventoryReservations,
  locations,
  products,
  transfers,
  users,
} from "@/db/schema";
import { getPublishedMediaForEntities } from "@/lib/media-repository";
import { deriveInventoryStatus } from "@/lib/inventory-domain";
import {
  inventoryMovementLabels,
  inventoryStatuses,
  type InventoryAdminFilters,
  type InventoryAdminStatus,
  type InventoryKardexFilters,
  type InventoryMovementsFilters,
} from "@/lib/inventory-admin-contract";

const defaultPageSize = 25;
const maxPageSize = 100;
const alertWindowMs = 48 * 60 * 60 * 1000;

function effectiveCategoryJoin() {
  return or(
    eq(products.editorialCategoryId, categories.id),
    and(isNull(products.editorialCategoryId), eq(products.categoryId, categories.id)),
  )!;
}

function effectiveFamilyJoin() {
  return or(
    eq(products.editorialFamilyId, families.id),
    and(isNull(products.editorialFamilyId), eq(products.familyId, families.id)),
  )!;
}

function effectiveBrandJoin() {
  return or(
    eq(products.editorialBrandId, brands.id),
    and(isNull(products.editorialBrandId), eq(products.brandId, brands.id)),
  )!;
}

function availableExpression() {
  return sql<number>`${inventoryBalances.onHand} - ${inventoryBalances.reserved}`;
}

function productConditions(
  filters: Pick<InventoryAdminFilters, "query" | "categoryId" | "familyId" | "brandId">,
) {
  const conditions: SQL[] = [];
  const query = filters.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(
      or(
        ilike(products.sku, pattern),
        ilike(products.normalizedName, pattern),
        ilike(products.commercialName, pattern),
        ilike(products.originalName, pattern),
        ilike(products.modelCode, pattern),
        ilike(products.application, pattern),
        ilike(products.refrigerant, pattern),
        ilike(products.voltage, pattern),
        ilike(products.power, pattern),
        ilike(products.capacitance, pattern),
        ilike(products.dimensions, pattern),
        ilike(categories.name, pattern),
        ilike(families.name, pattern),
        ilike(brands.name, pattern),
      )!,
    );
  }
  if (filters.categoryId)
    conditions.push(
      or(
        eq(products.editorialCategoryId, filters.categoryId),
        eq(products.categoryId, filters.categoryId),
      )!,
    );
  if (filters.familyId)
    conditions.push(
      or(
        eq(products.editorialFamilyId, filters.familyId),
        eq(products.familyId, filters.familyId),
      )!,
    );
  if (filters.brandId)
    conditions.push(
      or(eq(products.editorialBrandId, filters.brandId), eq(products.brandId, filters.brandId))!,
    );
  return conditions;
}

function statusCondition(status: InventoryAdminStatus | undefined) {
  if (!status) return undefined;
  const available = availableExpression();
  switch (status) {
    case "SIN_SALDO":
      return sql<boolean>`false`;
    case "SIN_MINIMO":
      return isNull(inventoryBalances.minimumStock);
    case "AGOTADO":
      return sql<boolean>`${available} = 0`;
    case "CRITICO":
      return sql<boolean>`${inventoryBalances.minimumStock} is not null and ${available} > 0 and ${available} <= ${inventoryBalances.minimumStock}`;
    case "BAJO":
      // There is no reorder threshold in the persisted model yet. Returning
      // no rows is safer than inventing a second threshold in the API.
      return sql<boolean>`false`;
    case "OPTIMO":
      return sql<boolean>`${inventoryBalances.minimumStock} is not null and ${available} > ${inventoryBalances.minimumStock}`;
    case "RESERVADO":
      return sql<boolean>`${inventoryBalances.reserved} > 0`;
  }
}

function inventoryConditions(filters: InventoryAdminFilters, includeStatus = true) {
  const conditions: SQL[] = [eq(locations.active, true), ...productConditions(filters)];
  if (filters.locationId) conditions.push(eq(inventoryBalances.locationId, filters.locationId));
  if (filters.hasReservations !== undefined)
    conditions.push(
      filters.hasReservations
        ? sql<boolean>`${inventoryBalances.reserved} > 0`
        : sql<boolean>`${inventoryBalances.reserved} = 0`,
    );
  if (filters.hasMinimum !== undefined)
    conditions.push(
      filters.hasMinimum
        ? sql<boolean>`${inventoryBalances.minimumStock} is not null`
        : isNull(inventoryBalances.minimumStock),
    );
  if (filters.minAvailable !== undefined)
    conditions.push(sql<boolean>`${availableExpression()} >= ${filters.minAvailable}`);
  if (filters.updatedFrom)
    conditions.push(
      sql`${inventoryBalances.updatedAt} >= ${new Date(`${filters.updatedFrom}T00:00:00-05:00`)}`,
    );
  if (filters.updatedTo)
    conditions.push(
      sql`${inventoryBalances.updatedAt} < ${new Date(new Date(`${filters.updatedTo}T00:00:00-05:00`).getTime() + 86_400_000)}`,
    );
  if (includeStatus) {
    const status = statusCondition(filters.status);
    if (status) conditions.push(status);
  }
  return conditions;
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function toDate(value: unknown) {
  return value instanceof Date ? value : value ? new Date(String(value)) : null;
}

function movementReference(referenceType: string | null, referenceId: string | null) {
  if (!referenceId) return referenceType ? referenceType : "Sin referencia";
  const label =
    referenceType === "order" || referenceType === "sale"
      ? "Pedido"
      : referenceType === "transfer" || referenceType === "transfer_cancel"
        ? "Traslado"
        : referenceType === "reservation" || referenceType === "reservation_expiry"
          ? "Reserva"
          : referenceType === "purchase"
            ? "Compra"
            : "Referencia";
  return `${label} ${referenceId}`;
}

const lastMovementAt = sql<Date | null>`(
  select im.created_at
  from inventory_movements im
  where im.product_id = ${inventoryBalances.productId}
    and im.location_id = ${inventoryBalances.locationId}
  order by im.created_at desc, im.id desc
  limit 1
)`;

const lastMovementType = sql<string | null>`(
  select im.type
  from inventory_movements im
  where im.product_id = ${inventoryBalances.productId}
    and im.location_id = ${inventoryBalances.locationId}
  order by im.created_at desc, im.id desc
  limit 1
)`;

const lastMovementQuantity = sql<number | null>`(
  select case
    when im.resulting_on_hand > im.previous_on_hand then im.quantity
    when im.resulting_on_hand < im.previous_on_hand then -im.quantity
    else im.resulting_reserved - im.previous_reserved
  end
  from inventory_movements im
  where im.product_id = ${inventoryBalances.productId}
    and im.location_id = ${inventoryBalances.locationId}
  order by im.created_at desc, im.id desc
  limit 1
)`;

function itemSelect() {
  return {
    id: inventoryBalances.id,
    productId: inventoryBalances.productId,
    sku: products.sku,
    productName: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})`,
    categoryName: categories.name,
    familyName: families.name,
    brandName: brands.name,
    locationId: locations.id,
    locationCode: locations.code,
    locationName: locations.name,
    locationType: locations.type,
    onHand: inventoryBalances.onHand,
    reserved: inventoryBalances.reserved,
    minimumStock: inventoryBalances.minimumStock,
    updatedAt: inventoryBalances.updatedAt,
    lastMovementAt,
    lastMovementType,
    lastMovementQuantity,
  };
}

async function getUnknownProductCount(
  db: ReturnType<typeof getDb>,
  filters: InventoryAdminFilters,
) {
  const balanceJoin = filters.locationId
    ? and(
        eq(inventoryBalances.productId, products.id),
        eq(inventoryBalances.locationId, filters.locationId),
      )!
    : eq(inventoryBalances.productId, products.id);
  const rows = await db
    .select({
      totalProducts: count(products.id),
      productsWithBalance: sql<string>`count(distinct ${inventoryBalances.productId})`,
    })
    .from(products)
    .innerJoin(categories, effectiveCategoryJoin())
    .innerJoin(families, effectiveFamilyJoin())
    .leftJoin(brands, effectiveBrandJoin())
    .leftJoin(inventoryBalances, balanceJoin)
    .where(and(...productConditions(filters)));
  const row = rows[0];
  return Math.max(0, toNumber(row?.totalProducts) - toNumber(row?.productsWithBalance));
}

export async function getInventoryAdminPage(filters: InventoryAdminFilters = {}) {
  const db = getDb();
  const requestedPage = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, Math.floor(filters.pageSize ?? defaultPageSize)),
  );
  const countWhere = and(...inventoryConditions(filters));
  const summaryWhere = and(...inventoryConditions({ ...filters, status: undefined }));
  const [
    totalRows,
    summaryRows,
    unknownProductCount,
    locationRows,
    facetRows,
    alertRows,
    expiringRows,
    pendingTransferRows,
    movementRows,
    transferRows,
    reservationRows,
    minimumRows,
    importRows,
  ] = await Promise.all([
    db
      .select({ total: count(inventoryBalances.id) })
      .from(inventoryBalances)
      .innerJoin(products, eq(inventoryBalances.productId, products.id))
      .innerJoin(locations, eq(inventoryBalances.locationId, locations.id))
      .innerJoin(categories, effectiveCategoryJoin())
      .innerJoin(families, effectiveFamilyJoin())
      .leftJoin(brands, effectiveBrandJoin())
      .where(countWhere),
    db
      .select({
        referencesWithBalance: sql<string>`count(distinct ${inventoryBalances.productId})`,
        onHandUnits: sql<string>`coalesce(sum(${inventoryBalances.onHand}), 0)`,
        reservedUnits: sql<string>`coalesce(sum(${inventoryBalances.reserved}), 0)`,
        availableUnits: sql<string>`coalesce(sum(${inventoryBalances.onHand} - ${inventoryBalances.reserved}), 0)`,
        criticalBalances: sql<string>`count(*) filter (where ${inventoryBalances.minimumStock} is not null and ${availableExpression()} > 0 and ${availableExpression()} <= ${inventoryBalances.minimumStock})`,
        outOfStockBalances: sql<string>`count(*) filter (where ${availableExpression()} = 0)`,
        balancesWithoutMinimum: sql<string>`count(*) filter (where ${inventoryBalances.minimumStock} is null)`,
      })
      .from(inventoryBalances)
      .innerJoin(products, eq(inventoryBalances.productId, products.id))
      .innerJoin(locations, eq(inventoryBalances.locationId, locations.id))
      .innerJoin(categories, effectiveCategoryJoin())
      .innerJoin(families, effectiveFamilyJoin())
      .leftJoin(brands, effectiveBrandJoin())
      .where(summaryWhere),
    getUnknownProductCount(db, filters),
    db
      .select({
        id: locations.id,
        code: locations.code,
        name: locations.name,
        type: locations.type,
        referencesWithBalance: sql<string>`count(distinct ${inventoryBalances.productId})`,
        onHandUnits: sql<string>`coalesce(sum(${inventoryBalances.onHand}), 0)`,
        reservedUnits: sql<string>`coalesce(sum(${inventoryBalances.reserved}), 0)`,
        availableUnits: sql<string>`coalesce(sum(${inventoryBalances.onHand} - ${inventoryBalances.reserved}), 0)`,
        criticalBalances: sql<string>`count(*) filter (where ${inventoryBalances.minimumStock} is not null and ${availableExpression()} > 0 and ${availableExpression()} <= ${inventoryBalances.minimumStock})`,
      })
      .from(locations)
      .leftJoin(inventoryBalances, eq(inventoryBalances.locationId, locations.id))
      .where(eq(locations.active, true))
      .groupBy(locations.id, locations.code, locations.name, locations.type)
      .orderBy(
        desc(sql`coalesce(sum(${inventoryBalances.onHand} - ${inventoryBalances.reserved}), 0)`),
        asc(locations.code),
      ),
    Promise.all([
      db
        .select({
          id: locations.id,
          code: locations.code,
          name: locations.name,
          type: locations.type,
        })
        .from(locations)
        .where(eq(locations.active, true))
        .orderBy(asc(locations.code)),
      db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.active, true))
        .orderBy(asc(categories.name)),
      db
        .select({ id: families.id, name: families.name, categoryId: families.categoryId })
        .from(families)
        .where(eq(families.active, true))
        .orderBy(asc(families.name)),
      db
        .select({ id: brands.id, name: brands.name })
        .from(brands)
        .where(eq(brands.active, true))
        .orderBy(asc(brands.name)),
    ]),
    db
      .select({
        id: inventoryBalances.id,
        productId: inventoryBalances.productId,
        sku: products.sku,
        productName: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})`,
        locationId: locations.id,
        locationName: locations.name,
        onHand: inventoryBalances.onHand,
        reserved: inventoryBalances.reserved,
        minimumStock: inventoryBalances.minimumStock,
      })
      .from(inventoryBalances)
      .innerJoin(products, eq(inventoryBalances.productId, products.id))
      .innerJoin(locations, eq(inventoryBalances.locationId, locations.id))
      .where(
        and(
          eq(locations.active, true),
          or(
            sql`${availableExpression()} = 0`,
            sql`${inventoryBalances.minimumStock} is not null and ${availableExpression()} > 0 and ${availableExpression()} <= ${inventoryBalances.minimumStock}`,
          )!,
        ),
      )
      .orderBy(asc(availableExpression()), asc(products.sku))
      .limit(8),
    db
      .select({ total: count(inventoryReservations.id) })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.status, "ACTIVE"),
          sql`${inventoryReservations.expiresAt} is not null`,
          lt(inventoryReservations.expiresAt, new Date(Date.now() + alertWindowMs)),
        ),
      ),
    db
      .select({ total: count(transfers.id) })
      .from(transfers)
      .where(inArray(transfers.status, ["REQUESTED", "IN_TRANSIT"])),
    db
      .select({
        id: inventoryMovements.id,
        type: inventoryMovements.type,
        quantity: inventoryMovements.quantity,
        previousOnHand: inventoryMovements.previousOnHand,
        resultingOnHand: inventoryMovements.resultingOnHand,
        previousReserved: inventoryMovements.previousReserved,
        resultingReserved: inventoryMovements.resultingReserved,
        referenceType: inventoryMovements.referenceType,
        referenceId: inventoryMovements.referenceId,
        reason: inventoryMovements.reason,
        notes: inventoryMovements.notes,
        sku: products.sku,
        productName: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})`,
        locationCode: locations.code,
        locationName: locations.name,
        actorName: sql<string | null>`coalesce(${users.name}, ${users.email})`,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .innerJoin(products, eq(inventoryMovements.productId, products.id))
      .innerJoin(locations, eq(inventoryMovements.locationId, locations.id))
      .leftJoin(users, eq(inventoryMovements.performedBy, users.id))
      .orderBy(desc(inventoryMovements.createdAt), desc(inventoryMovements.id))
      .limit(8),
    db
      .select({
        id: transfers.id,
        status: transfers.status,
        sourceCode: sql<string>`(select l.code from locations l where l.id = ${transfers.sourceLocationId})`,
        sourceName: sql<string>`(select l.name from locations l where l.id = ${transfers.sourceLocationId})`,
        destinationCode: sql<string>`(select l.code from locations l where l.id = ${transfers.destinationLocationId})`,
        destinationName: sql<string>`(select l.name from locations l where l.id = ${transfers.destinationLocationId})`,
        requestedByName: sql<
          string | null
        >`(select coalesce(u.name, u.email) from users u where u.id = ${transfers.requestedBy})`,
        itemCount: sql<string>`(select count(*) from transfer_items ti where ti.transfer_id = ${transfers.id})`,
        units: sql<string>`(select coalesce(sum(ti.quantity), 0) from transfer_items ti where ti.transfer_id = ${transfers.id})`,
        notes: transfers.notes,
        updatedAt: transfers.updatedAt,
      })
      .from(transfers)
      .orderBy(desc(transfers.updatedAt), desc(transfers.id))
      .limit(8),
    db
      .select({
        id: inventoryReservations.id,
        sku: products.sku,
        productName: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})`,
        locationCode: locations.code,
        locationName: locations.name,
        quantity: inventoryReservations.quantity,
        status: inventoryReservations.status,
        referenceType: inventoryReservations.referenceType,
        referenceId: inventoryReservations.referenceId,
        reason: inventoryReservations.reason,
        expiresAt: inventoryReservations.expiresAt,
        createdByName: sql<
          string | null
        >`(select coalesce(u.name, u.email) from users u where u.id = ${inventoryReservations.createdBy})`,
        createdAt: inventoryReservations.createdAt,
      })
      .from(inventoryReservations)
      .innerJoin(products, eq(inventoryReservations.productId, products.id))
      .innerJoin(locations, eq(inventoryReservations.locationId, locations.id))
      .orderBy(desc(inventoryReservations.createdAt), desc(inventoryReservations.id))
      .limit(8),
    db
      .select({
        id: inventoryBalances.id,
        sku: products.sku,
        productName: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})`,
        locationCode: locations.code,
        locationName: locations.name,
        onHand: inventoryBalances.onHand,
        reserved: inventoryBalances.reserved,
        minimumStock: inventoryBalances.minimumStock,
      })
      .from(inventoryBalances)
      .innerJoin(products, eq(inventoryBalances.productId, products.id))
      .innerJoin(locations, eq(inventoryBalances.locationId, locations.id))
      .where(sql`${inventoryBalances.minimumStock} is not null`)
      .orderBy(asc(availableExpression()), asc(products.sku))
      .limit(8),
    db
      .select({
        id: inventoryImportBatches.id,
        source: inventoryImportBatches.source,
        status: inventoryImportBatches.status,
        filename: inventoryImportBatches.filename,
        rowsRead: inventoryImportBatches.rowsRead,
        matched: inventoryImportBatches.matched,
        unmatched: inventoryImportBatches.unmatched,
        ambiguous: inventoryImportBatches.ambiguous,
        quantities: inventoryImportBatches.quantities,
        locations: inventoryImportBatches.locations,
        appliedBy: inventoryImportBatches.appliedBy,
        createdAt: inventoryImportBatches.createdAt,
        completedAt: inventoryImportBatches.completedAt,
      })
      .from(inventoryImportBatches)
      .orderBy(desc(inventoryImportBatches.createdAt), desc(inventoryImportBatches.id))
      .limit(8),
  ]);

  const totalItems = toNumber(totalRows[0]?.total);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const rawItems = await db
    .select(itemSelect())
    .from(inventoryBalances)
    .innerJoin(products, eq(inventoryBalances.productId, products.id))
    .innerJoin(locations, eq(inventoryBalances.locationId, locations.id))
    .innerJoin(categories, effectiveCategoryJoin())
    .innerJoin(families, effectiveFamilyJoin())
    .leftJoin(brands, effectiveBrandJoin())
    .where(countWhere)
    .orderBy(desc(inventoryBalances.updatedAt), asc(products.sku), asc(locations.code))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const media = await getPublishedMediaForEntities(
    "product",
    rawItems.map((item) => item.productId),
  );
  const items = rawItems.map((item) => {
    const onHand = Number(item.onHand);
    const reserved = Number(item.reserved);
    const minimumStock = item.minimumStock === null ? null : Number(item.minimumStock);
    return {
      ...item,
      onHand,
      reserved,
      available: onHand - reserved,
      minimumStock,
      status: deriveInventoryStatus({ onHand, reserved, minimumStock }),
      mediaUrl: media.get(item.productId)?.[0] ?? null,
      updatedAt: toDate(item.updatedAt)?.toISOString() ?? null,
      lastMovementAt: toDate(item.lastMovementAt)?.toISOString() ?? null,
      lastMovementType: item.lastMovementType,
      lastMovementLabel: item.lastMovementType
        ? (inventoryMovementLabels[item.lastMovementType as keyof typeof inventoryMovementLabels] ??
          "Movimiento")
        : null,
      lastMovementQuantity:
        item.lastMovementQuantity === null ? null : Number(item.lastMovementQuantity),
    };
  });
  const summary = summaryRows[0];
  const [facetLocations, facetCategories, facetFamilies, facetBrands] = facetRows;
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
    summary: {
      referencesWithBalance: toNumber(summary?.referencesWithBalance),
      onHandUnits: toNumber(summary?.onHandUnits),
      reservedUnits: toNumber(summary?.reservedUnits),
      availableUnits: toNumber(summary?.availableUnits),
      criticalBalances: toNumber(summary?.criticalBalances),
      outOfStockBalances: toNumber(summary?.outOfStockBalances),
      balancesWithoutMinimum: toNumber(summary?.balancesWithoutMinimum),
      stockUnknownProducts: unknownProductCount,
      activeLocations: facetLocations.length,
    },
    facets: {
      locations: facetLocations,
      categories: facetCategories,
      families: facetFamilies,
      brands: facetBrands,
      statuses: [...inventoryStatuses],
    },
    locations: locationRows.map((row) => ({
      ...row,
      referencesWithBalance: toNumber(row.referencesWithBalance),
      onHandUnits: toNumber(row.onHandUnits),
      reservedUnits: toNumber(row.reservedUnits),
      availableUnits: toNumber(row.availableUnits),
      criticalBalances: toNumber(row.criticalBalances),
    })),
    alerts: {
      items: alertRows.map((row) => {
        const onHand = Number(row.onHand);
        const reserved = Number(row.reserved);
        const minimumStock = row.minimumStock === null ? null : Number(row.minimumStock);
        return {
          ...row,
          onHand,
          reserved,
          available: onHand - reserved,
          minimumStock,
          status: deriveInventoryStatus({ onHand, reserved, minimumStock }),
        };
      }),
      counts: {
        critical: toNumber(summary?.criticalBalances),
        outOfStock: toNumber(summary?.outOfStockBalances),
        withoutMinimum: toNumber(summary?.balancesWithoutMinimum),
        stockUnknown: unknownProductCount,
        expiringReservations: toNumber(expiringRows[0]?.total),
        pendingTransfers: toNumber(pendingTransferRows[0]?.total),
      },
    },
    operations: {
      movements: movementRows.map((row) => ({
        ...row,
        label: inventoryMovementLabels[row.type],
        entry: row.resultingOnHand > row.previousOnHand ? row.quantity : 0,
        exit: row.resultingOnHand < row.previousOnHand ? row.quantity : 0,
        reservedDelta: row.resultingReserved - row.previousReserved,
        referenceLabel: movementReference(row.referenceType, row.referenceId),
        createdAt: toDate(row.createdAt)?.toISOString() ?? null,
      })),
      transfers: transferRows.map((row) => ({
        ...row,
        itemCount: toNumber(row.itemCount),
        units: toNumber(row.units),
        updatedAt: toDate(row.updatedAt)?.toISOString() ?? null,
      })),
      reservations: reservationRows.map((row) => ({
        ...row,
        expiresAt: toDate(row.expiresAt)?.toISOString() ?? null,
        createdAt: toDate(row.createdAt)?.toISOString() ?? null,
      })),
      minimums: minimumRows.map((row) => {
        const onHand = Number(row.onHand);
        const reserved = Number(row.reserved);
        const minimumStock = row.minimumStock === null ? null : Number(row.minimumStock);
        return {
          ...row,
          onHand,
          reserved,
          minimumStock,
          available: onHand - reserved,
          status: deriveInventoryStatus({ onHand, reserved, minimumStock }),
        };
      }),
      imports: importRows.map((row) => ({
        ...row,
        createdAt: toDate(row.createdAt)?.toISOString() ?? null,
        completedAt: toDate(row.completedAt)?.toISOString() ?? null,
      })),
    },
    fetchedAt: new Date().toISOString(),
  };
}

export async function getInventoryAdminExport(filters: InventoryAdminFilters = {}) {
  const db = getDb();
  const rows = await db
    .select({
      sku: products.sku,
      productName: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})`,
      locationCode: locations.code,
      locationName: locations.name,
      onHand: inventoryBalances.onHand,
      reserved: inventoryBalances.reserved,
      minimumStock: inventoryBalances.minimumStock,
      updatedAt: inventoryBalances.updatedAt,
    })
    .from(inventoryBalances)
    .innerJoin(products, eq(inventoryBalances.productId, products.id))
    .innerJoin(locations, eq(inventoryBalances.locationId, locations.id))
    .innerJoin(categories, effectiveCategoryJoin())
    .innerJoin(families, effectiveFamilyJoin())
    .leftJoin(brands, effectiveBrandJoin())
    .where(and(...inventoryConditions(filters)))
    .orderBy(asc(products.sku), asc(locations.code));
  return rows.map((row) => {
    const onHand = Number(row.onHand);
    const reserved = Number(row.reserved);
    const minimumStock = row.minimumStock === null ? null : Number(row.minimumStock);
    return {
      ...row,
      onHand,
      reserved,
      available: onHand - reserved,
      minimumStock,
      status: deriveInventoryStatus({ onHand, reserved, minimumStock }),
      updatedAt: toDate(row.updatedAt)?.toISOString() ?? null,
    };
  });
}

export async function getInventoryKardexPage(filters: InventoryKardexFilters) {
  const db = getDb();
  const pageSize = Math.min(maxPageSize, Math.max(1, Math.floor(filters.pageSize ?? 25)));
  const requestedPage = Math.max(1, Math.floor(filters.page ?? 1));
  const conditions: SQL[] = [
    eq(inventoryMovements.productId, filters.productId),
    eq(inventoryMovements.locationId, filters.locationId),
  ];
  if (filters.type) conditions.push(eq(inventoryMovements.type, filters.type));
  if (filters.dateFrom)
    conditions.push(
      sql`${inventoryMovements.createdAt} >= ${new Date(`${filters.dateFrom}T00:00:00-05:00`)}`,
    );
  if (filters.dateTo)
    conditions.push(
      sql`${inventoryMovements.createdAt} < ${new Date(new Date(`${filters.dateTo}T00:00:00-05:00`).getTime() + 86_400_000)}`,
    );
  const where = and(...conditions);
  const totalRows = await db
    .select({ total: count(inventoryMovements.id) })
    .from(inventoryMovements)
    .where(where);
  const totalItems = toNumber(totalRows[0]?.total);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const rows = await db
    .select({
      id: inventoryMovements.id,
      type: inventoryMovements.type,
      quantity: inventoryMovements.quantity,
      previousOnHand: inventoryMovements.previousOnHand,
      resultingOnHand: inventoryMovements.resultingOnHand,
      previousReserved: inventoryMovements.previousReserved,
      resultingReserved: inventoryMovements.resultingReserved,
      referenceType: inventoryMovements.referenceType,
      referenceId: inventoryMovements.referenceId,
      reason: inventoryMovements.reason,
      notes: inventoryMovements.notes,
      createdAt: inventoryMovements.createdAt,
      actorName: sql<string | null>`coalesce(${users.name}, ${users.email})`,
    })
    .from(inventoryMovements)
    .leftJoin(users, eq(inventoryMovements.performedBy, users.id))
    .where(where)
    .orderBy(desc(inventoryMovements.createdAt), desc(inventoryMovements.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const items = rows.map((row) => ({
    ...row,
    label: inventoryMovementLabels[row.type],
    entry: row.resultingOnHand > row.previousOnHand ? row.quantity : 0,
    exit: row.resultingOnHand < row.previousOnHand ? row.quantity : 0,
    reservedDelta: row.resultingReserved - row.previousReserved,
    availableAfter: row.resultingOnHand - row.resultingReserved,
    referenceLabel: movementReference(row.referenceType, row.referenceId),
  }));
  return { items, page, pageSize, totalItems, totalPages };
}

export async function getInventoryKardexExport(filters: InventoryKardexFilters) {
  const firstPage = await getInventoryKardexPage({ ...filters, page: 1, pageSize: maxPageSize });
  const items = [...firstPage.items];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const nextPage = await getInventoryKardexPage({ ...filters, page, pageSize: maxPageSize });
    items.push(...nextPage.items);
  }
  return items;
}

export async function getInventoryMovementsPage(filters: InventoryMovementsFilters = {}) {
  const db = getDb();
  const pageSize = Math.min(maxPageSize, Math.max(1, Math.floor(filters.pageSize ?? 25)));
  const requestedPage = Math.max(1, Math.floor(filters.page ?? 1));
  const conditions: SQL[] = [];
  if (filters.productId) conditions.push(eq(inventoryMovements.productId, filters.productId));
  if (filters.locationId) conditions.push(eq(inventoryMovements.locationId, filters.locationId));
  if (filters.type) conditions.push(eq(inventoryMovements.type, filters.type));
  if (filters.actorQuery) {
    const pattern = `%${filters.actorQuery}%`;
    conditions.push(or(ilike(users.name, pattern), ilike(users.email, pattern))!);
  }
  if (filters.dateFrom)
    conditions.push(
      sql`${inventoryMovements.createdAt} >= ${new Date(`${filters.dateFrom}T00:00:00-05:00`)}`,
    );
  if (filters.dateTo)
    conditions.push(
      sql`${inventoryMovements.createdAt} < ${new Date(new Date(`${filters.dateTo}T00:00:00-05:00`).getTime() + 86_400_000)}`,
    );
  const where = conditions.length ? and(...conditions) : undefined;
  const totalRows = await db
    .select({ total: count(inventoryMovements.id) })
    .from(inventoryMovements)
    .leftJoin(users, eq(inventoryMovements.performedBy, users.id))
    .where(where);
  const totalItems = toNumber(totalRows[0]?.total);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const rows = await db
    .select({
      id: inventoryMovements.id,
      type: inventoryMovements.type,
      quantity: inventoryMovements.quantity,
      previousOnHand: inventoryMovements.previousOnHand,
      resultingOnHand: inventoryMovements.resultingOnHand,
      previousReserved: inventoryMovements.previousReserved,
      resultingReserved: inventoryMovements.resultingReserved,
      referenceType: inventoryMovements.referenceType,
      referenceId: inventoryMovements.referenceId,
      reason: inventoryMovements.reason,
      notes: inventoryMovements.notes,
      createdAt: inventoryMovements.createdAt,
      sku: products.sku,
      productName: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})`,
      locationCode: locations.code,
      locationName: locations.name,
      actorName: sql<string | null>`coalesce(${users.name}, ${users.email})`,
    })
    .from(inventoryMovements)
    .innerJoin(products, eq(inventoryMovements.productId, products.id))
    .innerJoin(locations, eq(inventoryMovements.locationId, locations.id))
    .leftJoin(users, eq(inventoryMovements.performedBy, users.id))
    .where(where)
    .orderBy(desc(inventoryMovements.createdAt), desc(inventoryMovements.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return {
    items: rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      previousOnHand: Number(row.previousOnHand),
      resultingOnHand: Number(row.resultingOnHand),
      previousReserved: Number(row.previousReserved),
      resultingReserved: Number(row.resultingReserved),
      label: inventoryMovementLabels[row.type],
      entry: Number(row.resultingOnHand) > Number(row.previousOnHand) ? Number(row.quantity) : 0,
      exit: Number(row.resultingOnHand) < Number(row.previousOnHand) ? Number(row.quantity) : 0,
      reservedDelta: Number(row.resultingReserved) - Number(row.previousReserved),
      availableBefore: Number(row.previousOnHand) - Number(row.previousReserved),
      availableAfter: Number(row.resultingOnHand) - Number(row.resultingReserved),
      referenceLabel: movementReference(row.referenceType, row.referenceId),
      createdAt: toDate(row.createdAt)?.toISOString() ?? null,
    })),
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}

export async function getInventoryProductOptions(query = "", locationId?: string) {
  const db = getDb();
  const pattern = query.trim() ? `%${query.trim()}%` : null;
  const conditions: SQL[] = [];
  if (pattern)
    conditions.push(
      or(
        ilike(products.sku, pattern),
        ilike(products.normalizedName, pattern),
        ilike(products.commercialName, pattern),
        ilike(products.originalName, pattern),
        ilike(products.modelCode, pattern),
        ilike(products.originalReferenceCode, pattern),
        ilike(products.barcode, pattern),
        sql`exists (select 1 from brands as b where b.id = ${products.brandId} and b.name ilike ${pattern})`,
      )!,
    );
  const balanceJoin = locationId
    ? and(
        eq(inventoryBalances.productId, products.id),
        eq(inventoryBalances.locationId, locationId),
      )!
    : eq(inventoryBalances.productId, products.id);
  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})`,
      available: sql<string>`coalesce(sum(${inventoryBalances.onHand} - ${inventoryBalances.reserved}), 0)`,
    })
    .from(products)
    .leftJoin(inventoryBalances, balanceJoin)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(
      products.id,
      products.sku,
      products.commercialName,
      products.normalizedName,
      products.originalName,
    )
    .orderBy(asc(products.sku))
    .limit(25);
  return rows.map((row) => ({ ...row, available: Number(row.available) }));
}
