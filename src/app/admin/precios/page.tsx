import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { PricingWorkspace } from "@/components/admin/AdminCategoryViews";
import { PricingOperations } from "@/components/admin/PricingOperations";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getPricingHistoryPage, getPricingPage, listDiscountRules } from "@/lib/pricing-repository";
import { parsePricingFilters, type PricingFilters } from "@/lib/pricing-contract";

export const metadata: Metadata = { title: "Precios | Panel admin ColdPower", description: "Precios, vigencias, historial y reglas de descuento gobernadas." };

type Params = Record<string, string | string[] | undefined>;

function value(params: Params, key: string) {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

function readFilters(params: Params): PricingFilters {
  const query = new URLSearchParams();
  for (const key of ["query", "sku", "productId", "categoryId", "familyId", "brandId", "priceType", "status", "active", "page", "pageSize"]) {
    const current = value(params, key);
    if (current !== undefined) query.set(key, current);
  }
  try { return parsePricingFilters(query); } catch { return {}; }
}

function money(amount: string | undefined, currency: string | undefined) {
  return amount ? `${currency ?? "PEN"} ${amount}` : undefined;
}

export default async function AdminPreciosPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const actor = await requirePermission("pricing.view");
  const params = (await searchParams) ?? {};
  const filters = readFilters(params);
  const includeCost = can(actor.role, "pricing.cost.view");
  const canEditPrices = can(actor.role, "pricing.edit");
  const canManageDiscounts = can(actor.role, "pricing.discount.manage");
  const [pricing, productRows, rules, history] = await Promise.all([
    getPricingPage(filters, { includeCost }),
    getDb().select({ id: products.id, sku: products.sku, name: products.commercialName, normalizedName: products.normalizedName }).from(products).orderBy(asc(products.sku)).limit(2000),
    listDiscountRules(),
    getPricingHistoryPage({ page: 1, pageSize: 20 }, { includeCost }),
  ]);
  const prices = pricing.items.flatMap((item) => (item.prices ?? []).map((price) => ({ ...price, productId: item.productId, sku: item.sku, productName: item.productName })));
  const rows = pricing.items.map((item) => {
    const itemPrices = item.prices ?? [];
    const retail = itemPrices.find((price) => price.priceType === "RETAIL");
    const wholesale = itemPrices.find((price) => price.priceType === "WHOLESALE");
    const minimum = itemPrices.find((price) => price.priceType === "MINIMUM");
    const special = itemPrices.find((price) => price.priceType === "SPECIAL");
    return { id: item.id, sku: item.sku, product: item.productName, retail: money(retail?.amount, retail?.currency), wholesale: money(wholesale?.amount, wholesale?.currency), minimum: money(minimum?.amount, minimum?.currency), promotion: money(special?.amount, special?.currency), status: item.price ? (item.price.active ? "Activo" : "Archivado") : "Sin precio" };
  });
  const query = new URLSearchParams();
  for (const [key, current] of Object.entries(params)) if (current !== undefined) query.set(key, Array.isArray(current) ? current[0] : current);
  const exportHref = `/api/admin/precios/export${query.toString() ? `?${query.toString()}` : ""}`;
  return <PricingWorkspace rows={rows} metrics={pricing.metrics} historyCount={history.totalItems} page={pricing.page} pageSize={pricing.pageSize} totalItems={pricing.totalItems} totalPages={pricing.totalPages} exportHref={exportHref} filters={filters} categoryOptions={pricing.facets.categories} statusOptions={pricing.facets.statuses} canEditPrices={canEditPrices} controls={<PricingOperations products={productRows.map((product) => ({ id: product.id, sku: product.sku, name: product.name?.trim() || product.normalizedName }))} prices={prices} rules={rules} history={history.items} canEditPrices={canEditPrices} canManageCost={includeCost} canManageDiscounts={canManageDiscounts} />} />;
}
