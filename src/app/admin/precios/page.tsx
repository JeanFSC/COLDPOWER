import type { Metadata } from "next";
import { PricingWorkspace } from "@/components/admin/PricingWorkspace";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getPricingHistoryPage, getPricingPage, listDiscountRules } from "@/lib/pricing-repository";
import { resolvePricingPageFilters } from "@/lib/pricing-page-filters";

export const metadata: Metadata = { title: "Precios | Panel admin ColdPower", description: "Precios, vigencias, historial y reglas de descuento gobernadas." };

type Params = Record<string, string | string[] | undefined>;

export default async function AdminPreciosPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const actor = await requirePermission("pricing.view");
  const params = (await searchParams) ?? {};
  const { filters, filterNotice, exportHref } = resolvePricingPageFilters(params);
  const includeCost = can(actor.role, "pricing.cost.view");
  const canEditPrices = can(actor.role, "pricing.edit");
  const canManageDiscounts = can(actor.role, "pricing.discount.manage");
  const canViewMargin = can(actor.role, "pricing.margin.view");
  const [pricing, rules, history] = await Promise.all([
    getPricingPage(filters, { includeCost }),
    listDiscountRules(),
    getPricingHistoryPage({ page: 1, pageSize: 20 }, { includeCost }),
  ]);
  return <PricingWorkspace items={pricing.items} metrics={pricing.metrics} historyCount={history.totalItems} history={history.items} rules={rules} page={pricing.page} pageSize={pricing.pageSize} totalItems={pricing.totalItems} totalPages={pricing.totalPages} exportHref={exportHref} filters={filters} filterNotice={filterNotice} facets={{ categories: pricing.facets.categories, families: pricing.facets.families, brands: pricing.facets.brands, statuses: pricing.facets.statuses }} canEditPrices={canEditPrices} canManageCost={includeCost} canViewMargin={canViewMargin} canManageDiscounts={canManageDiscounts} />;
}
