import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg";

const sizeStyles: Record<BrandLogoSize, { image: string; gap: string }> = {
  sm: { image: "w-[150px]", gap: "gap-0" },
  md: { image: "w-[180px]", gap: "gap-0" },
  lg: { image: "w-[220px]", gap: "gap-0" },
};

function LogoLockup({ variant, className }: { variant: "dark" | "light"; className?: string }) {
  return (
    <Image
      src={variant === "light" ? "/brand/logo-coldpower-lockup-light-transparent.png" : "/brand/logo-coldpower-lockup.png"}
      alt="ColdPower"
      width={2172}
      height={724}
      className={cn(className, "block h-auto max-w-full shrink-0 object-contain")}
      priority
    />
  );
}

type BrandLogoProps = {
  variant?: "dark" | "light";
  compact?: boolean;
  size?: BrandLogoSize;
  href?: string | null;
  className?: string;
};

export function BrandLogo({
  variant = "dark",
  compact = false,
  size = "md",
  href = "/",
  className,
}: BrandLogoProps) {
  const s = sizeStyles[size];
  const imageClass = compact ? "w-[150px]" : s.image;
  const content = <LogoLockup variant={variant} className={imageClass} />;

  if (href === null) {
    return (
      <span aria-label="ColdPower" className={cn("inline-flex shrink-0 items-center", s.gap, className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      aria-label="Ir al inicio de ColdPower"
      className={cn("group inline-flex shrink-0 items-center", s.gap, className)}
    >
      {content}
    </Link>
  );
}
