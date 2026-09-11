import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary text-primary-foreground active:opacity-80",
  secondary: "bg-muted text-foreground active:opacity-70",
  ghost: "bg-transparent text-foreground active:bg-muted",
  danger: "bg-danger text-danger-foreground active:opacity-80",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "flex h-12 w-full items-center justify-center rounded-2xl px-5 text-base font-medium transition-opacity disabled:pointer-events-none disabled:opacity-50",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {loading ? "…" : children}
    </button>
  );
}
