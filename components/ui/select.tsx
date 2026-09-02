import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, className, children, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-muted-foreground text-sm font-medium">
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        className={cn(
          "border-border bg-card text-card-foreground focus:border-primary h-12 rounded-2xl border px-4 text-base outline-none",
          error && "border-danger",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  );
});
