import { toPlannedBudget, type PlannedBudget } from "@/types/planned-budget";
import { BaseService } from "./base-service";
import type { DbClient, WriteResult } from "./types";

export class PlannedBudgetService extends BaseService {
  constructor(db: DbClient) {
    super(db, "plannedBudgets");
  }

  listForTrip(tripId: string): Promise<PlannedBudget[]> {
    return this.memo(`trip:${tripId}`, async () => {
      const { data } = await this.db
        .from("planned_budgets")
        .select("*")
        .eq("trip_id", tripId);
      return (data ?? []).map(toPlannedBudget);
    });
  }

  /**
   * Sets a category's planned amount for a trip, inserting or updating. The
   * caller checks the trip is the user's (RLS enforces it as well).
   */
  async upsert(tripId: string, categoryId: string, amount: number): Promise<WriteResult> {
    const { error } = await this.db
      .from("planned_budgets")
      .upsert(
        { trip_id: tripId, category_id: categoryId, planned_amount: amount },
        { onConflict: "trip_id,category_id" },
      );
    if (error) return this.fail("upsert", error);
    this.invalidate();
    return {};
  }
}
