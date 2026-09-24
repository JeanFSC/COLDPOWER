import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "offer"
  | "stock"
  | "warning"
  | "danger"
  | "new"
  | "warranty"
  | "neutral"
  | "tech";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  offer: "bg-primary text-white",
  stock: "bg-success text-white",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
  new: "bg-teal text-dark",
  warranty: "bg-primary/12 text-primary-dark ring-1 ring-primary/25",
  neutral: "bg-dark/7 text-gray-text ring-1 ring-border",
  tech: "bg-teal/12 text-teal ring-1 ring-teal/25",
};

export function Badge({ children, className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-pill px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em]",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
