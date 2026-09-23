import { cn } from "@/lib/utils";

type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  dark?: boolean;
  className?: string;
};

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = "left",
  dark = false,
  className,
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-secondary-600">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "font-display text-3xl font-black tracking-normal sm:text-4xl",
          dark ? "text-white" : "text-dark",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className={cn("mt-4 text-base leading-7", dark ? "text-gray-light" : "text-gray-text")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
