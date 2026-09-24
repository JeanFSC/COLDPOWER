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
      src={variant === "light" ? "/brand/logo-coldpower-lockup-light.webp" : "/brand/logo-coldpower-lockup.webp"}
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
  showTagline?: boolean;
};

export function BrandLogo({
  variant = "dark",
  compact = false,
  size = "md",
  href = "/",
  className,
  showTagline = false,
}: BrandLogoProps) {
  const s = sizeStyles[size];
  const imageClass = compact ? "w-[150px]" : s.image;
  const content = (
    <>
      <LogoLockup variant={variant} className={imageClass} />
      {showTagline ? <span className="brand-logo-tagline">SOLUCIONES EN REFRIGERACIÓN</span> : null}
    </>
  );
  const wrapperClass = showTagline ? "brand-logo-with-tagline" : "";

  if (href === null) {
    return (
      <span aria-label="ColdPower" className={cn("inline-flex shrink-0 items-center", s.gap, wrapperClass, className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      aria-label="Ir al inicio de ColdPower"
      className={cn("group inline-flex shrink-0 items-center", s.gap, wrapperClass, className)}
    >
      {content}
    </Link>
  );
}
