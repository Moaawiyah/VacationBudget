import { cn } from "@/lib/utils";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const width = Math.max(0, Math.min(100, value));
  const isOver = value > 100;

  return (
    <div className={cn("bg-muted h-2 w-full overflow-hidden rounded-full", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          isOver ? "bg-danger" : "bg-primary",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
