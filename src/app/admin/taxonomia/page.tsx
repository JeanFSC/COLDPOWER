import type { Metadata } from "next";
import { TaxonomyWorkspace } from "@/components/admin/TaxonomyWorkspace";
import { requireTaxonomyPageAccess } from "@/lib/taxonomy-access";
import { getTaxonomyTree } from "@/lib/taxonomy-admin";
import { can } from "@/lib/roles";

export const metadata: Metadata = { title: "Categorías, familias y marcas | Panel admin ColdPower" };

export default async function AdminTaxonomiaPage() {
  const actor = await requireTaxonomyPageAccess();
  const [categoryPage, familyPage, brandPage] = await Promise.all([
    getTaxonomyTree("categories"),
    getTaxonomyTree("families"),
    getTaxonomyTree("brands"),
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
