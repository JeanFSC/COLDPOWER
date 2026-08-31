"use client";

import { useEffect, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useCart } from "@/components/cart/CartProvider";

type AddToCartButtonProps = {
  productId: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function AddToCartButton({
  productId,
  label = "Agregar",
  size = "sm",
  className,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [wasAdded, setWasAdded] = useState(false);

  useEffect(() => {
    if (!wasAdded) {
      return;
    }

    const timeout = window.setTimeout(() => setWasAdded(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [wasAdded]);

  return (
    <Button
      type="button"
      variant={wasAdded ? "secondary" : "primary"}
      size={size}
      className={className}
      onClick={() => {
        addItem(productId);
        setWasAdded(true);
      }}
      aria-live="polite"
    >
      {wasAdded ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
      )}
      {wasAdded ? "Agregado" : label}
    </Button>
  );
}
