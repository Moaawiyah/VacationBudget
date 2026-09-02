import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toPlannedBudget, type PlannedBudget } from "@/types/planned-budget";

export const getPlannedBudgetsForTrip = cache(
  async (tripId: string): Promise<PlannedBudget[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("planned_budgets")
      .select("*")
      .eq("trip_id", tripId);
    return (data ?? []).map(toPlannedBudget);
  },
);
