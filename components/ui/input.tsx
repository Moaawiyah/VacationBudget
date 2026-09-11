import { type InputHTMLAttributes, forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  /** Optional decorative icon shown at the start of the field (RTL-aware). */
  icon?: LucideIcon;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className, icon: Icon, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      id={id}
      className={cn(
        "border-border bg-card text-card-foreground focus:border-primary h-12 rounded-2xl border text-base outline-none",
        Icon ? "w-full ps-11 pe-4" : "px-4",
        error && "border-danger",
        className,
      )}
      {...props}
    />
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
