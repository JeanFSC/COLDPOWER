import type { Metadata } from "next";
import { TaxonomyWorkspace } from "@/components/admin/TaxonomyWorkspace";
import { requireTaxonomyPageAccess } from "@/lib/taxonomy-access";
import { getTaxonomyPage } from "@/lib/taxonomy-admin";
import { can } from "@/lib/roles";

export const metadata: Metadata = { title: "Categorías, familias y marcas | Panel admin ColdPower" };

export default async function AdminTaxonomiaPage() {
  const actor = await requireTaxonomyPageAccess();
  const [categoryPage, familyPage, brandPage] = await Promise.all([
    getTaxonomyPage({ entity: "categories", page: 1, pageSize: 100 }),
    getTaxonomyPage({ entity: "families", page: 1, pageSize: 100 }),
    getTaxonomyPage({ entity: "brands", page: 1, pageSize: 100 }),
  ]);
  return (
    <TaxonomyWorkspace
      categories={categoryPage}
      families={familyPage}
      brands={brandPage}
      canManageCategories={can(actor.role, "catalog.category.manage")}
      canManageFamilies={can(actor.role, "catalog.family.manage")}
      canManageBrands={can(actor.role, "catalog.brand.manage")}
    />
  );
}
