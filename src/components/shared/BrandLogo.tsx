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

type BrandLogoProps = {
  variant?: "dark" | "light";
  compact?: boolean;
  size?: BrandLogoSize;
  href?: string | null;
  className?: string;
};

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} role="img" aria-label="ColdPower" focusable="false">
      <defs>
        <linearGradient id="neoLogoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2620B" />
          <stop offset="1" stopColor="#A63F06" />
        </linearGradient>
      </defs>
      <path
        d="M22 2 L39.3 12 L39.3 32 L22 42 L4.7 32 L4.7 12 Z"
        fill="url(#neoLogoGrad)"
        stroke="#0E1320"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M22 7.2 L34.8 14.6 L34.8 29.4 L22 36.8 L9.2 29.4 L9.2 14.6 Z"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <text
        x="22"
        y="29.5"
        textAnchor="middle"
        fontFamily="'Sora','Arial Black',system-ui,sans-serif"
        fontWeight="800"
        fontSize="20"
        fill="#ffffff"
      >
        C
      </text>
      <circle cx="32.4" cy="13.2" r="2.1" fill="#0FB5A6" />
    </svg>
  );
}

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
      <LogoMark className={cn(s.mark, "shrink-0 drop-shadow-sm")} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-black tracking-tight",
            s.word,
            isLight ? "text-white" : "text-dark",
          )}
        >
          COLD<span className="text-primary">POWER</span>
        </span>
        {!compact ? (
          <span
            className={cn(
              "mt-1 font-extrabold uppercase tracking-[0.22em]",
              s.tag,
              isLight ? "text-gray-light" : "text-gray-text",
            )}
          >
            Refrigeración · Aire acondicionado
          </span>
        ) : null}
      </span>
    </>
  );

  if (href === null) {
    return (
      <span
        aria-label="ColdPower"
        className={cn("inline-flex shrink-0 items-center", s.gap, className)}
      >
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
