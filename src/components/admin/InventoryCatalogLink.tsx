"use client";
import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
const CatalogAccess = createContext(false);
export function InventoryCatalogAccess({canOpen,children}:{canOpen:boolean;children:ReactNode}) {
 return <CatalogAccess.Provider value={canOpen}>{children}</CatalogAccess.Provider>;
}
export function InventoryCatalogLink({productId,className,children}:{productId:string;className?:string;children:ReactNode}) {
 const canOpen=useContext(CatalogAccess);
 return canOpen && productId ? <Link href={`/admin/catalogo/${encodeURIComponent(productId)}`} className={className}>{children}</Link> : <span className={className}>{children}</span>;
}