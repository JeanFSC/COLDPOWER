import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { getDb } from "@/db";
import { locations, products } from "@/db/schema";
import { listSuppliers } from "@/lib/purchases-service";
import { getPurchasesPage } from "@/lib/purchases-repository";
import { PurchasesOperations } from "@/components/admin/PurchasesOperations";

export const metadata: Metadata = { title: "Compras | Panel admin ColdPower", description: "Proveedores, órdenes de compra y recepciones de ColdPower." };
export default async function AdminComprasPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("purchases.view");
  const params=(await searchParams)??{};const query=new URLSearchParams();for(const[key,value]of Object.entries(params)){if(typeof value==="string")query.set(key,value);else if(Array.isArray(value)&&value[0])query.set(key,value[0]);}
  const db=getDb();const [suppliers,activeLocations,catalogProducts,purchasePage]=await Promise.all([listSuppliers(),db.select({id:locations.id,name:locations.name}).from(locations).where(eq(locations.active,true)).orderBy(asc(locations.name)),db.select({id:products.id,sku:products.sku,name:products.normalizedName}).from(products).orderBy(asc(products.sku)).limit(2000),getPurchasesPage({query:query.get("query")??undefined,status:query.get("status") as never,supplierId:query.get("supplierId")??undefined,locationId:query.get("locationId")??undefined,currency:query.get("currency")??undefined,page:Number(query.get("page")??1),pageSize:Number(query.get("pageSize")??25)})]);
  return <div><h1 className="font-display text-3xl font-black text-dark">Compras y proveedores</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-gray-text">La compra no altera inventario al crearla. Solo una recepción validada genera `PURCHASE_RECEIPT` y actualiza Kardex transaccionalmente.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><Metric label="Proveedores" value={suppliers.length}/><Metric label="Órdenes" value={purchasePage.totalItems}/><Metric label="Pendientes" value={purchasePage.metrics.pending+purchasePage.metrics.partialReceived}/></div><PurchasesOperations suppliers={suppliers.map(supplier=>({id:supplier.id,name:supplier.name,currency:supplier.currency,status:supplier.status}))} locations={activeLocations} products={catalogProducts} purchases={purchasePage.items.map(purchase=>({id:purchase.id,code:purchase.code,supplierId:purchase.supplierId,locationId:purchase.locationId,status:purchase.status,currency:purchase.currency,subtotal:purchase.subtotal}))}/></div>;
}
function Metric({label,value}:{label:string;value:number}){return <div className="rounded-md border border-border bg-white p-5"><p className="text-xs font-extrabold uppercase tracking-[0.1em] text-gray-text">{label}</p><p className="mt-2 font-display text-3xl font-black text-dark">{value}</p></div>}
