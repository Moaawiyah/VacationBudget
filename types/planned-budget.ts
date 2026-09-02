import type { Database } from "@/types/database";

type Row = Database["public"]["Tables"]["planned_budgets"]["Row"];

export type PlannedBudget = Omit<Row, "planned_amount"> & { planned_amount: number };

export function toPlannedBudget(row: Row): PlannedBudget {
  return { ...row, planned_amount: Number(row.planned_amount) };
}
