import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { getOrdersPage } from "@/lib/orders-repository";
import { parseOrdersFilters } from "@/lib/orders-contract";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";
import { ManualPaymentControl } from "@/components/admin/ManualPaymentControl";
import { OrdersWorkspace } from "@/components/admin/AdminCategoryViews";

export const metadata: Metadata = { title: "Pedidos | Panel admin ColdPower", description: "Gestiona pedidos, reservas y estados de entrega de ColdPower." };
export default async function AdminPedidosPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("orders.manage");
  const params=(await searchParams)??{};const query=new URLSearchParams();for(const[key,value]of Object.entries(params)){if(typeof value==="string")query.set(key,value);else if(Array.isArray(value)&&value[0])query.set(key,value[0]);}const page=await getOrdersPage(parseOrdersFilters(query));
  return <OrdersWorkspace rows={page.items.map((order)=>({id:order.id,customer:order.customerName,total:`${order.currency} ${order.total}`,status:order.status,delivery:order.deliveryMethod,date:order.createdAt.toLocaleDateString("es-PE")}))} metrics={page.metrics} pagination={{page:page.page,totalPages:page.totalPages,totalItems:page.totalItems}} facets={page.facets} query={query.get("query")??undefined} queryString={query.toString()} exportHref={`/api/admin/pedidos/export?${query.toString()}`} controls={<div className="grid gap-3">{page.items.map((order)=><div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e3ebf2] p-3"><div><p className="font-mono text-[10px] font-extrabold text-[#304b66]">{order.code}</p><p className="mt-1 text-[10px] text-[#8296a9]">{order.customerName} · {order.currency} {order.total}</p></div><div className="flex flex-wrap items-center gap-2"><OrderStatusControl orderId={order.id} status={order.status as Parameters<typeof OrderStatusControl>[0]["status"]} />{order.status === "PAYMENT_PENDING" ? <ManualPaymentControl orderId={order.id} amount={order.total} currency={order.currency} /> : null}</div></div>)}</div>} />;
}
