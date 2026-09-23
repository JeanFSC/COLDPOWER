"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShoppingCart } from "@/components/shopping-cart/ShoppingCartProvider";

type CartButtonProps = {
  className?: string;
  showLabel?: boolean;
};

// Purchase cart entry point (/carrito). The quote list has its own button.
export function CartButton({ className, showLabel = false }: CartButtonProps) {
  const { cart } = useShoppingCart();
  const totalQuantity = cart.totalQuantity;
  const label = totalQuantity > 0 ? `Ver carrito de compra con ${totalQuantity} unidad${totalQuantity === 1 ? "" : "es"}` : "Ver carrito de compra";

  return (
    <Link
      href="/carrito"
      prefetch={false}
      aria-label={label}
      title="Carrito de compra"
      className={cn(
        showLabel
          ? "relative inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-bold text-dark transition hover:border-primary hover:text-primary"
          : "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-dark transition hover:border-primary hover:text-primary",
        className,
      )}
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      {showLabel ? <span>Carrito ({totalQuantity > 99 ? "99+" : totalQuantity})</span> : null}
      {!showLabel && totalQuantity > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-black leading-none text-white ring-2 ring-white">
          {totalQuantity > 99 ? "99+" : totalQuantity}
        </span>
      ) : null}
    </Link>
  );
}
