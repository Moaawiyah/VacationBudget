import { cn } from "@/lib/utils";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const width = Math.max(0, Math.min(100, value));
  const isOver = value > 100;

  return (
    <div
      role="progressbar"
      aria-label="Budget used"
      aria-valuenow={width}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("bg-muted h-2.5 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          isOver ? "bg-danger" : "bg-budget-fill",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
