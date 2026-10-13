import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { users } from "../src/db/schema";
import { can, type AppRole } from "../src/lib/roles";
import { applyStockImport, previewStockImport } from "../src/lib/stock-import-service";
function option(name:string){const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:undefined;}
async function main(){
 const filename=option("--file");
 if(!filename) throw new Error("Uso: pnpm import:stock -- --file archivo.xlsx --dry-run | --apply --actor-id ID --confirm-fingerprint HASH");
 const resolved=path.resolve(filename);
 if(!/\.(xlsx|xls|csv)$/i.test(resolved)) throw new Error("El archivo debe ser XLSX, XLS o CSV.");
 if(fs.statSync(resolved).size>5*1024*1024) throw new Error("El archivo supera 5 MB.");
 const file=fs.readFileSync(resolved); const data=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength) as ArrayBuffer;
 if(!process.argv.includes("--apply")){console.log(JSON.stringify({mode:"dry-run",applied:false,preview:await previewStockImport(data)},null,2));return;}
 const actorId=option("--actor-id"), fingerprint=option("--confirm-fingerprint");
 if(!actorId||!fingerprint||!/^[a-f0-9]{64}$/.test(fingerprint))throw new Error("Aplicar requiere --actor-id y --confirm-fingerprint obtenido de la vista previa.");
 const [user]=await getDb().select().from(users).where(eq(users.id,actorId)).limit(1);
 const role=(user?.roleCode??user?.role) as AppRole;
 if(!user||user.status!=="ACTIVE"||!can(role,"inventory.adjust"))throw new Error("El usuario debe estar activo y tener permiso para ajustar inventario.");
 console.log(JSON.stringify({mode:"apply",...await applyStockImport(data,path.basename(resolved),fingerprint,{userId:user.id,role})},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"No se pudo importar el stock.");process.exitCode=1;}).finally(closeDb);