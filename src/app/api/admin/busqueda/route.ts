import { desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, families, products, quotes } from "@/db/schema";
import { customers, opportunities } from "@/db/crm-schema";
import { orders, sales } from "@/db/sales-schema";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { can, isStaffRole } from "@/lib/roles";

const MAX_RESULTS_PER_GROUP = 5;

type SearchItem = { id: string; label: string; detail: string; href: string };

function group(key: string, label: string, items: SearchItem[]) {
  return items.length ? { key, label, items } : null;
}

export async function GET(request: Request) {
  try {
    const actor = await requireApiUser();
    if (!isStaffRole(actor.role)) throw new ApiAuthorizationError();
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return apiSuccess({ groups: [] });

    const db = getDb();
    const pattern = `%${query}%`;
    const [productRows, customerRows, quoteRows, opportunityRows, saleRows, orderRows] = await Promise.all([
      can(actor.role, "catalog.product.view")
        ? db.select({ id: products.id, sku: products.sku, name: products.commercialName, originalName: products.originalName, category: categories.name, family: families.name })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .leftJoin(families, eq(products.familyId, families.id))
            .where(or(
              ilike(products.sku, pattern), ilike(products.commercialName, pattern), ilike(products.originalName, pattern),
              ilike(products.normalizedName, pattern), ilike(products.modelCode, pattern), ilike(products.application, pattern),
              ilike(products.refrigerant, pattern), ilike(products.voltage, pattern), ilike(products.power, pattern),
              ilike(products.capacitance, pattern), ilike(products.dimensions, pattern),
            ))
            .orderBy(desc(products.updatedAt))
            .limit(MAX_RESULTS_PER_GROUP)
        : Promise.resolve([]),
      can(actor.role, "customers.view")
        ? db.select({ id: customers.id, name: customers.name, email: customers.email, documentNumber: customers.documentNumber, ruc: customers.ruc })
            .from(customers)
            .where(or(ilike(customers.name, pattern), ilike(customers.email, pattern), ilike(customers.documentNumber, pattern), ilike(customers.ruc, pattern)))
            .orderBy(desc(customers.updatedAt))
            .limit(MAX_RESULTS_PER_GROUP)
        : Promise.resolve([]),
      can(actor.role, "quotes.view")
        ? db.select({ id: quotes.id, trackingCode: quotes.trackingCode, name: quotes.name, productName: quotes.productName, sku: quotes.sku, status: quotes.status })
            .from(quotes)
            .where(or(ilike(quotes.trackingCode, pattern), ilike(quotes.name, pattern), ilike(quotes.productName, pattern), ilike(quotes.sku, pattern)))
            .orderBy(desc(quotes.updatedAt))
            .limit(MAX_RESULTS_PER_GROUP)
        : Promise.resolve([]),
      can(actor.role, "crm.view")
        ? db.select({ id: opportunities.id, code: opportunities.code, title: opportunities.title, stage: opportunities.stage, customerName: customers.name })
            .from(opportunities)
            .leftJoin(customers, eq(opportunities.customerId, customers.id))
            .where(or(ilike(opportunities.code, pattern), ilike(opportunities.title, pattern), ilike(customers.name, pattern)))
            .orderBy(desc(opportunities.updatedAt))
            .limit(MAX_RESULTS_PER_GROUP)
        : Promise.resolve([]),
      can(actor.role, "sales.view")
        ? db.select({ id: sales.id, code: sales.code, status: sales.status, customerName: customers.name })
            .from(sales)
            .leftJoin(customers, eq(sales.customerId, customers.id))
            .where(or(ilike(sales.code, pattern), ilike(customers.name, pattern)))
            .orderBy(desc(sales.updatedAt))
            .limit(MAX_RESULTS_PER_GROUP)
        : Promise.resolve([]),
      can(actor.role, "orders.view")
        ? db.select({ id: orders.id, code: orders.code, status: orders.status, customerName: orders.customerNameSnapshot })
            .from(orders)
            .where(or(ilike(orders.code, pattern), ilike(orders.customerNameSnapshot, pattern)))
            .orderBy(desc(orders.updatedAt))
            .limit(MAX_RESULTS_PER_GROUP)
        : Promise.resolve([]),
    ]);

    return apiSuccess({
      groups: [
        group("products", "Productos", productRows.map((row) => ({ id: row.id, label: row.name || row.originalName, detail: [row.sku, row.category, row.family].filter(Boolean).join(" · "), href: `/admin/catalogo/${row.id}` }))),
        group("customers", "Clientes", customerRows.map((row) => ({ id: row.id, label: row.name, detail: row.email || row.ruc || row.documentNumber || "Cliente", href: `/admin/clientes?query=${encodeURIComponent(row.name)}` }))),
        group("quotes", "Cotizaciones", quoteRows.map((row) => ({ id: row.id, label: row.trackingCode, detail: [row.name, row.productName || row.sku, row.status].filter(Boolean).join(" · "), href: `/admin/cotizaciones?query=${encodeURIComponent(row.trackingCode)}` }))),
        group("opportunities", "Oportunidades", opportunityRows.map((row) => ({ id: row.id, label: row.code, detail: [row.title, row.customerName, row.stage].filter(Boolean).join(" · "), href: `/admin/oportunidades?query=${encodeURIComponent(row.code)}` }))),
        group("sales", "Ventas", saleRows.map((row) => ({ id: row.id, label: row.code, detail: [row.customerName, row.status].filter(Boolean).join(" · "), href: `/admin/ventas?query=${encodeURIComponent(row.code)}` }))),
        group("orders", "Pedidos", orderRows.map((row) => ({ id: row.id, label: row.code, detail: [row.customerName, row.status].filter(Boolean).join(" · "), href: `/admin/pedidos?query=${encodeURIComponent(row.code)}` }))),
      ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
    });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("ADMIN_SEARCH_FORBIDDEN", "No tienes permiso para buscar en el panel.", 403);
    return apiError("ADMIN_SEARCH_UNAVAILABLE", "La búsqueda administrativa no está disponible.", 503);
  }
}
