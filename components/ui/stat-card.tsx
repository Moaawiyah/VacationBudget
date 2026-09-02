import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "danger" | "success";
};

const TONE_CLASS: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-card-foreground",
  danger: "text-danger",
  success: "text-success",
};

export function StatCard({ label, value, sublabel, tone = "default" }: StatCardProps) {
  return (
    <div className="border-border bg-card rounded-3xl border p-4">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold", TONE_CLASS[tone])}>{value}</p>
      {sublabel && <p className="text-muted-foreground mt-0.5 text-xs">{sublabel}</p>}
    </div>
  );
}
