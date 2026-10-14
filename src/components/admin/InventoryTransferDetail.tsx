"use client";
import { InventoryCatalogLink } from "@/components/admin/InventoryCatalogLink";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminDrawer } from "@/components/admin/AdminDrawer";

type Detail = {
 transfer: { id: string; status: string; notes: string | null; createdAt: string; receivedAt: string | null };
 source: {name:string;code:string} | null;
 destination: {name:string;code:string} | null;
 items: Array<{id:string;productId:string;sku:string;name:string|null;quantity:number}>;
};
const labels: Record<string,string> = { DRAFT:"Borrador", REQUESTED:"Solicitado", IN_TRANSIT:"En tránsito", RECEIVED:"Recibido", CANCELLED:"Cancelado" };
export function inventoryTransferHref(query: string, id: string) {
 const params = new URLSearchParams(query);
 params.set("tab", "transfers"); params.set("transferId", id);
 return `/admin/inventario?${params.toString()}`;
}
export function InventoryTransferDetail() {
 const params = useSearchParams(); const router = useRouter();
 const id = params.get("transferId");
 const [state, setState] = useState<{id:string;data?:Detail;error?:string}|null>(null);
 const [revision,setRevision] = useState(0);
 useEffect(() => {
  if(!id) return;
  let cancelled=false;
  void fetch(`/api/admin/inventario/transferencias/${encodeURIComponent(id)}`, {cache:"no-store"}).then(async response=>{
   const data=await response.json();
   if(!response.ok) throw new Error(typeof data.error === "string" ? data.error : "No se pudo cargar el traslado.");
   if(!cancelled) setState({id,data});
  }).catch(error=>{if(!cancelled) setState({id,error:error instanceof Error?error.message:"No se pudo cargar el traslado."});});
  return()=>{cancelled=true;};
 },[id,revision]);
 const close=()=>{const query=new URLSearchParams(params.toString());query.delete("transferId");router.replace(`/admin/inventario?${query.toString()}`,{scroll:false});};
 const current=state?.id===id?state:null;
 const date=(value:string)=>new Date(value).toLocaleString("es-PE",{timeZone:"America/Lima"});
 return <AdminDrawer open={Boolean(id)} title="Detalle de transferencia" onClose={close} size="wide">
  {!current ? <p role="status">Cargando traslado…</p> : current.error ? <div role="alert"><p>{current.error}</p><button type="button" onClick={()=>{setState(null);setRevision(value=>value+1);}} className="mt-3 rounded-lg border px-3 py-2">Reintentar</button></div> : current.data ? <div className="space-y-5">
   <p className="break-all font-mono text-xs">{current.data.transfer.id}</p>
   <p className="font-semibold">{labels[current.data.transfer.status]??"Estado no clasificado"}</p>
   <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-slate-500">Origen</dt><dd>{current.data.source?.name??"Local no disponible"} · {current.data.source?.code}</dd></div><div><dt className="text-sm text-slate-500">Destino</dt><dd>{current.data.destination?.name??"Local no disponible"} · {current.data.destination?.code}</dd></div><div><dt className="text-sm text-slate-500">Creado</dt><dd>{date(current.data.transfer.createdAt)}</dd></div><div><dt className="text-sm text-slate-500">Recibido</dt><dd>{current.data.transfer.receivedAt?date(current.data.transfer.receivedAt):"Sin recepción registrada"}</dd></div></dl>
   {current.data.transfer.notes?<p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{current.data.transfer.notes}</p>:null}
   <h3 className="font-semibold">Productos trasladados</h3>
   {current.data.items.length?<ul className="space-y-2">{current.data.items.map(item=><li key={item.id} className="rounded-lg border p-3"><InventoryCatalogLink productId={item.productId} className="text-blue-600 underline">{item.sku}</InventoryCatalogLink><p>{item.name??"Sin nombre"}</p><p>{item.quantity} {item.quantity===1?"unidad":"unidades"}</p></li>)}</ul>:<p>Sin productos asociados.</p>}
  </div>:null}
 </AdminDrawer>;
}