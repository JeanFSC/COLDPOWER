import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg";

const sizeStyles: Record<BrandLogoSize, { mark: string; gap: string; word: string; tag: string }> = {
  sm: { mark: "h-9 w-9", gap: "gap-2.5", word: "text-lg", tag: "text-[9px]" },
  md: { mark: "h-10 w-10", gap: "gap-3", word: "text-xl sm:text-2xl", tag: "text-[10px]" },
  lg: {
    mark: "h-14 w-14 sm:h-16 sm:w-16",
    gap: "gap-3.5",
    word: "text-2xl sm:text-4xl",
    tag: "text-xs",
  },
};

function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-coldpower.png"
      alt=""
      width={1254}
      height={1254}
      className={cn(className, "shrink-0 object-contain")}
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
  const isLight = variant === "light";
  const s = sizeStyles[size];

  const content = (
    <>
      <LogoMark className={cn(s.mark, "drop-shadow-sm")} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-bold tracking-tight",
            s.word,
            isLight ? "text-white" : "text-brand-primary-900",
          )}
        >
          COLD<span className="text-brand-secondary-600">POWER</span>
        </span>
        {!compact ? (
          <span
            className={cn(
              "mt-1 font-mono uppercase tracking-[0.12em]",
              s.tag,
              isLight ? "text-gray-light" : "text-text-secondary",
            )}
          >
            Catálogo técnico · HVAC
          </span>
        ) : null}
      </span>
    </>
  );

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
      aria-label="Ir al inicio de ColdPower"
      className={cn("group inline-flex shrink-0 items-center", s.gap, className)}
    >
      {content}
    </Link>
  );
}
