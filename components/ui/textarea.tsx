import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, className, rows = 3, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-muted-foreground text-sm font-medium">
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={cn(
          "border-border bg-card text-card-foreground focus:border-primary resize-none rounded-2xl border px-4 py-3 text-base outline-none",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  );
});
