import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-muted-foreground text-sm font-medium">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        className={cn(
          "border-border bg-card text-card-foreground focus:border-primary h-12 rounded-2xl border px-4 text-base outline-none",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  );
});
