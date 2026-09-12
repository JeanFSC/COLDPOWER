import type { Metadata } from "next";
import { PricingWorkspace } from "@/components/admin/PricingWorkspace";
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
  for (const key of ["query", "sku", "productId", "categoryId", "familyId", "brandId", "priceType", "status", "active", "effectiveStatus", "pricingCoverage", "currency", "hasWholesale", "hasPromotion", "hasMinimum", "validFrom", "validUntil", "updatedFrom", "updatedUntil", "sort", "order", "page", "pageSize"]) {
    const current = value(params, key);
    if (current !== undefined) query.set(key, current);
  }
  try { return parsePricingFilters(query); } catch { return {}; }
}

export default async function AdminPreciosPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const actor = await requirePermission("pricing.view");
  const params = (await searchParams) ?? {};
  const filters = readFilters(params);
  const includeCost = can(actor.role, "pricing.cost.view");
  const canEditPrices = can(actor.role, "pricing.edit");
  const canManageDiscounts = can(actor.role, "pricing.discount.manage");
  const canViewMargin = can(actor.role, "pricing.margin.view");
  const [pricing, rules, history] = await Promise.all([
    getPricingPage(filters, { includeCost }),
    listDiscountRules(),
    getPricingHistoryPage({ page: 1, pageSize: 20 }, { includeCost }),
  ]);
  const query = new URLSearchParams();
  for (const [key, current] of Object.entries(params)) if (current !== undefined) query.set(key, Array.isArray(current) ? current[0] : current);
  const exportHref = `/api/admin/precios/export${query.toString() ? `?${query.toString()}` : ""}`;
  return <PricingWorkspace items={pricing.items} metrics={pricing.metrics} historyCount={history.totalItems} history={history.items} rules={rules} page={pricing.page} pageSize={pricing.pageSize} totalItems={pricing.totalItems} totalPages={pricing.totalPages} exportHref={exportHref} filters={filters} facets={{ categories: pricing.facets.categories, families: pricing.facets.families, brands: pricing.facets.brands, statuses: pricing.facets.statuses }} canEditPrices={canEditPrices} canManageCost={includeCost} canViewMargin={canViewMargin} canManageDiscounts={canManageDiscounts} />;
}
