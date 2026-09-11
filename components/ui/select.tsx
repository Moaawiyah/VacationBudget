import { type SelectHTMLAttributes, forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  /** Optional decorative icon shown at the start of the field (RTL-aware). */
  icon?: LucideIcon;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, className, children, icon: Icon, ...props },
  ref,
) {
  const field = (
    <select
      ref={ref}
      id={id}
      className={cn(
        "border-border bg-card text-card-foreground focus:border-primary h-12 rounded-2xl border text-base outline-none",
        Icon ? "w-full ps-11 pe-4" : "px-4",
        error && "border-danger",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-muted-foreground text-sm font-medium">
        {label}
      </label>
      {Icon ? (
        <div className="relative">
          <Icon
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute start-4 top-1/2 h-4 w-4 shrink-0 -translate-y-1/2"
          />
          {field}
        </div>
      ) : (
        field
      )}
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  );
});
