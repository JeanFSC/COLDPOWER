import { redirect } from "next/navigation";
import { requireApiPermission, requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { taxonomyPermission, type TaxonomyEntity } from "@/lib/taxonomy-admin";

export function requireTaxonomyAccess(entity: TaxonomyEntity) {
  return requireApiPermission(taxonomyPermission(entity));
}

export async function requireTaxonomyPageAccess() {
  const actor = await requirePermission("catalog.category.manage");
  if (!can(actor.role, "catalog.family.manage") || !can(actor.role, "catalog.brand.manage")) {
    redirect("/admin/sin-acceso");
  }
  return actor;
}
