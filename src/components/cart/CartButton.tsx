"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/cart/CartProvider";

type CartButtonProps = {
  className?: string;
};

export function CartButton({ className }: CartButtonProps) {
  const { totalQuantity } = useCart();
  const label =
    totalQuantity > 0
      ? `Ver carrito con ${totalQuantity} producto${totalQuantity === 1 ? "" : "s"}`
      : "Ver carrito";

  return (
    <Link
      href="/cotizacion?carrito=1"
      prefetch={false}
      aria-label={label}
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-dark transition hover:border-primary hover:text-primary",
        className,
      )}
    >
      <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-black leading-none text-white ring-2 ring-white">
        {totalQuantity}
      </span>
    </Link>
  );
}
