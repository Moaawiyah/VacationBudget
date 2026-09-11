import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryService } from "@/lib/sdk/category-service";
import { PlannedBudgetService } from "@/lib/sdk/planned-budget-service";
import { VacationBudgetSDK } from "@/lib/sdk/sdk";
import { AuthService } from "@/lib/sdk/auth-service";
import { TripService } from "@/lib/sdk/trip-service";
import { CUSTOM_CATEGORY_ICON } from "@/lib/icons";
import { callsOf, createFakeDb, muteErrorLog } from "../helpers/fake-db";
import { CATEGORY_FOOD } from "../helpers/fixtures";

afterEach(() => vi.restoreAllMocks());

const food = { id: CATEGORY_FOOD, user_id: null, name: "Food", icon: "utensils" };

describe("CategoryService", () => {
  it("lists categories by name, cached, and [] when empty", async () => {
    const { db, from, calls } = createFakeDb({ categories: [{ data: [food] }] });
    const categories = new CategoryService(db);
    expect(await categories.list()).toEqual([food]);
    expect(await categories.list()).toEqual([food]);
    expect(from).toHaveBeenCalledTimes(1);
    expect(callsOf(calls, "categories", "order")).toEqual([["name"]]);
    expect(await new CategoryService(createFakeDb().db).list()).toEqual([]);
  });

  it("creates a custom category for the user with the custom icon", async () => {
    const created = { ...food, id: "c-new", user_id: "user-1", name: "Gifts" };
    const { db, calls } = createFakeDb({ categories: [{ data: created }] });
    expect(await new CategoryService(db).create("user-1", "Gifts")).toEqual({
      category: created,
    });
    expect(callsOf(calls, "categories", "insert")[0]).toEqual([
      { user_id: "user-1", name: "Gifts", icon: CUSTOM_CATEGORY_ICON },
    ]);
  });

  it("returns an error when create fails or returns nothing", async () => {
    muteErrorLog();
    const { db } = createFakeDb({
      categories: [{ error: { message: "duplicate" } }, {}],
    });
    const categories = new CategoryService(db);
    expect(await categories.create("user-1", "Food")).toEqual({ error: "duplicate" });
    expect(await categories.create("user-1", "Food")).toEqual({
      error: "No category returned",
    });
  });
});

describe("PlannedBudgetService", () => {
  it("lists a trip's planned budgets with numeric amounts", async () => {
    const row = {
      id: "p1",
      trip_id: "trip-1",
      category_id: CATEGORY_FOOD,
      planned_amount: "300",
    };
    const { db } = createFakeDb({ planned_budgets: [{ data: [row] }] });
    const list = await new PlannedBudgetService(db).listForTrip("trip-1");
    expect(list[0]?.planned_amount).toBe(300);
    expect(await new PlannedBudgetService(createFakeDb().db).listForTrip("t")).toEqual(
      [],
    );
  });

  it("upserts on (trip, category)", async () => {
    const { db, calls } = createFakeDb();
    expect(
      await new PlannedBudgetService(db).upsert("trip-1", CATEGORY_FOOD, 250),
    ).toEqual({});
    expect(callsOf(calls, "planned_budgets", "upsert")[0]).toEqual([
      { trip_id: "trip-1", category_id: CATEGORY_FOOD, planned_amount: 250 },
      { onConflict: "trip_id,category_id" },
    ]);
  });

  it("returns upsert errors", async () => {
    muteErrorLog();
    const { db } = createFakeDb({ planned_budgets: [{ error: { message: "rls" } }] });
    expect(await new PlannedBudgetService(db).upsert("trip-1", CATEGORY_FOOD, 1)).toEqual(
      {
        error: "rls",
      },
    );
  });
});

describe("VacationBudgetSDK", () => {
  it("wires every service to the injected client", () => {
    const sdk = new VacationBudgetSDK(createFakeDb().db);
    expect(sdk.auth).toBeInstanceOf(AuthService);
    expect(sdk.trips).toBeInstanceOf(TripService);
    expect(sdk.expenses).toBeDefined();
    expect(sdk.categories).toBeInstanceOf(CategoryService);
    expect(sdk.plannedBudgets).toBeInstanceOf(PlannedBudgetService);
  });
});
