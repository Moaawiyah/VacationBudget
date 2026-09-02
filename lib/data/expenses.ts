import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toExpenseWithCategory, type ExpenseWithCategory } from "@/types/expense";

export const getExpensesForTrip = cache(
  async (tripId: string): Promise<ExpenseWithCategory[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("expenses")
      .select("*, categories(name, icon)")
      .eq("trip_id", tripId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });
    return (data ?? []).map(toExpenseWithCategory);
  },
);
