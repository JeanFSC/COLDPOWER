import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "whatsapp";
type ButtonSize = "sm" | "md" | "lg";

type ButtonBaseProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type NativeButtonProps = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkButtonProps = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    disabled?: boolean;
  };

export type ButtonProps = NativeButtonProps | LinkButtonProps;

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white shadow-card hover:bg-primary-hover",
  secondary: "bg-dark-secondary text-white hover:bg-dark",
  outline: "border border-border bg-white text-dark hover:border-primary hover:text-primary",
  ghost: "bg-transparent text-dark hover:bg-dark/5",
  whatsapp: "bg-whatsapp text-white shadow-card hover:bg-success",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-sm",
  lg: "h-14 px-7 text-base",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-pill font-bold transition focus-visible:outline focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-55";

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  if ("href" in props && props.href) {
    const { disabled, href, ...anchorProps } = props;

    const linkProps = {
      className: cn(classes, disabled && "pointer-events-none opacity-55"),
      href: disabled ? "#" : href,
      "aria-disabled": disabled,
      ...anchorProps,
    };
    return href.startsWith("/") ? <Link {...linkProps}>{children}</Link> : <a {...linkProps}>{children}</a>;
  }

  const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button {...buttonProps} className={classes} type={buttonProps.type ?? "button"}>
      {children}
    </button>
  );
}
