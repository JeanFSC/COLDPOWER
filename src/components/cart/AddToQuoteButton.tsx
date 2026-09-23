"use client";

import { useEffect, useState } from "react";
import { Check, FileText } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useCart as useQuoteList } from "@/components/cart/CartProvider";

type AddToQuoteButtonProps = {
  productId: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline";
  className?: string;
};

// Adds the product to the quote list (Lista de cotización), never to the purchase cart.
export function AddToQuoteButton({ productId, label = "Cotizar", size = "sm", variant = "outline", className }: AddToQuoteButtonProps) {
  const { addItem } = useQuoteList();
  const [wasAdded, setWasAdded] = useState(false);

  useEffect(() => {
    if (!wasAdded) return;
    const timeout = window.setTimeout(() => setWasAdded(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [wasAdded]);

  return (
    <Button
      type="button"
      variant={wasAdded ? "secondary" : variant}
      size={size}
      className={className}
      aria-live="polite"
      onClick={() => {
        addItem(productId);
        setWasAdded(true);
      }}
    >
      {wasAdded ? <Check className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
      {wasAdded ? "En cotización" : label}
    </Button>
  );
}
