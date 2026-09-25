"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, ShoppingCart, Tag } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useShoppingCart } from "@/components/shopping-cart/ShoppingCartProvider";

type AddToCartButtonProps = {
  productId: string;
  // Only products with an active retail price can be bought; the rest are quote-only.
  purchasable: boolean;
  label?: string;
  disabledLabel?: string;
  quantity?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function AddToCartButton({ productId, purchasable, label = "Agregar al carrito", disabledLabel = "Solo cotizable", quantity = 1, size = "sm", className }: AddToCartButtonProps) {
  const { addItem, pendingProductId } = useShoppingCart();
  const [feedback, setFeedback] = useState<"idle" | "added" | "failed">("idle");
  const pending = pendingProductId === productId;

  useEffect(() => {
    if (feedback === "idle") return;
    const timeout = window.setTimeout(() => setFeedback("idle"), 1600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  if (!purchasable) {
    return (
      <Button type="button" variant="outline" size={size} className={className} disabled title={disabledLabel === "Solo cotizable" ? "Este producto no tiene precio publicado. Solicítalo por cotización." : "Este producto no está disponible para compra en este momento."}>
        <Tag className="h-4 w-4" aria-hidden="true" />
        {disabledLabel}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={feedback === "added" ? "secondary" : "primary"}
      size={size}
      className={className}
      disabled={pending}
      aria-live="polite"
      onClick={async () => setFeedback((await addItem(productId, quantity)) ? "added" : "failed")}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : feedback === "added" ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
      {pending ? "Agregando…" : feedback === "added" ? "En el carrito" : feedback === "failed" ? "No se pudo agregar" : label}
    </Button>
  );
}
