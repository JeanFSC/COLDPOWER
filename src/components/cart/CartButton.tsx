"use client";

import Link from "next/link";
import { ChevronDown, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShoppingCart } from "@/components/shopping-cart/ShoppingCartProvider";

type CartButtonProps = { className?: string; showLabel?: boolean };

export function CartButton({ className, showLabel = false }: CartButtonProps) {
  const { cart } = useShoppingCart();
  const totalQuantity = cart.items.reduce((total, item) => total + (item.purchasable && item.available && item.unitPrice !== null ? item.quantity : 0), 0);
  const label = totalQuantity > 0 ? `Ver carrito de compra con ${totalQuantity} unidad${totalQuantity === 1 ? "" : "es"}` : "Ver carrito de compra";
  const badge = totalQuantity > 99 ? "99+" : totalQuantity;

  return (
    <Link href="/carrito" prefetch={false} aria-label={label} title="Carrito de compra" className={cn(showLabel ? "home-cart-link" : "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-dark transition hover:border-brand-secondary-600 hover:text-brand-secondary-600", className)}>
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      {showLabel ? <span>Carrito ({badge})</span> : null}
      {showLabel ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : null}
      {!showLabel && totalQuantity > 0 ? <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-secondary-600 px-1 text-[11px] font-black leading-none text-white ring-2 ring-white">{badge}</span> : null}
    </Link>
  );
}
