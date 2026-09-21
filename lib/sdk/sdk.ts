import { AuthService } from "./auth-service";
import { CategoryService } from "./category-service";
import { ExpenseService } from "./expense-service";
import { PlannedBudgetService } from "./planned-budget-service";
import { TripService } from "./trip-service";
import { CompanionService } from "./companion-service";
import type { DbClient } from "./types";

/**
 * The app's public data API. Pages, Server Actions and Route Handlers use
 * only this — never a Supabase client directly — so every query lives in
 * exactly one service method.
 */
export class VacationBudgetSDK {
  readonly auth: AuthService;
  readonly trips: TripService;
  readonly expenses: ExpenseService;
  readonly categories: CategoryService;
  readonly plannedBudgets: PlannedBudgetService;
  readonly companions: CompanionService;

  /**
   * @param db the request's Supabase client (user session; RLS applies)
   * @param admin optional service-role client, used only for the
   *   signup duplicate checks and private username-to-email resolution
   */
  constructor(db: DbClient, admin: DbClient | null = null) {
    this.auth = new AuthService(db, admin);
    this.trips = new TripService(db);
    this.expenses = new ExpenseService(db);
    this.categories = new CategoryService(db);
    this.plannedBudgets = new PlannedBudgetService(db);
    this.companions = new CompanionService(admin);
  }
}
