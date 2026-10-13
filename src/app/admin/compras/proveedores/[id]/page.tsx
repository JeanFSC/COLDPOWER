import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupplierDetailWorkspace } from "@/components/admin/SupplierDetailWorkspace";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getSupplierDetail } from "@/lib/purchases-repository";

export const metadata: Metadata = { title: "Detalle del proveedor | Compras | Panel admin ColdPower" };

export default async function SupplierDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePermission("purchases.view");
  const { id } = await params;
  const query = await searchParams;
  const detail = await getSupplierDetail(id, { receiptsPage: Number(query.receiptsPage), documentsPage: Number(query.documentsPage), ordersPage: Number(query.ordersPage), productsPage: Number(query.productsPage) });
  if (!detail) notFound();
  return <SupplierDetailWorkspace detail={detail} canManage={can(actor.role, "purchases.manage")} />;
}
