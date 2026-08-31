import type { Metadata } from "next";
import { TaxonomyManager } from "@/components/admin/TaxonomyManager";
import { requirePermission } from "@/lib/auth";
import { getTaxonomyPage } from "@/lib/taxonomy-admin";

export const metadata: Metadata = { title: "Categorías, familias y marcas | Panel admin ColdPower" };
export default async function AdminTaxonomiaPage() { await requirePermission("catalog.product.edit"); const [categoryPage, familyPage, brandPage] = await Promise.all([getTaxonomyPage({ entity: "categories", page: 1, pageSize: 100 }), getTaxonomyPage({ entity: "families", page: 1, pageSize: 100 }), getTaxonomyPage({ entity: "brands", page: 1, pageSize: 100 })]); const map = (item: (typeof categoryPage.items)[number]) => ({ ...item, categoryId: item.categoryId ?? undefined, categoryName: item.categoryName ?? undefined }); return <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Catálogo maestro</p><h1 className="mt-2 font-display text-3xl font-black text-dark">Taxonomía editorial</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-gray-text">Administra categorías, familias y marcas reutilizables. La desactivación es reversible y todos los cambios quedan auditados.</p><TaxonomyManager categories={categoryPage.items.map(map)} families={familyPage.items.map(map)} brands={brandPage.items.map(map)} /></div>; }
