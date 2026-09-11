import { type TextareaHTMLAttributes, forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  /** Optional decorative icon shown at the top-start of the field (RTL-aware). */
  icon?: LucideIcon;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, className, rows = 3, icon: Icon, ...props },
  ref,
) {
  const field = (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      className={cn(
        "border-border bg-card text-card-foreground focus:border-primary resize-none rounded-2xl border py-3 text-base outline-none",
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
            className="text-muted-foreground pointer-events-none absolute start-4 top-4 h-4 w-4 shrink-0"
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
