import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  /** Optional decorative icon rendered before the label. */
  icon?: LucideIcon;
  value: string;
  sublabel?: string;
  tone?: "default" | "danger" | "success";
};

const TONE_CLASS: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-card-foreground",
  danger: "text-danger",
  success: "text-success",
};

export function StatCard({
  label,
  icon: Icon,
  value,
  sublabel,
  tone = "default",
}: StatCardProps) {
  return (
    <div className="panel h-full">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        {Icon && <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-blue-500" />}
        {label}
      </p>
      <p className={cn("mt-3 text-2xl font-semibold", TONE_CLASS[tone])}>{value}</p>
      {sublabel && <p className="text-muted-foreground mt-0.5 text-xs">{sublabel}</p>}
    </div>
  );
}
