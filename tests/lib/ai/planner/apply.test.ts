import { describe, expect, it, vi } from "vitest";
import { applyBudgetPlan } from "@/lib/ai/planner/apply";
import type { VacationBudgetSDK } from "@/lib/sdk/sdk";

const TRIP = "trip-1";

function fakeSdk(opts: { owned?: boolean; planned?: { category_id: string; planned_amount: number }[]; failUpsert?: boolean } = {}) {
  const upsert = vi.fn(async () => (opts.failUpsert ? { error: "boom" } : {}));
  let next = 0;
  const create = vi.fn(async (_userId: string, name: string) => ({ category: { id: `new-${next++}`, name } }));
  const sdk = {
    trips: { isOwnedBy: vi.fn(async () => opts.owned ?? true) },
    categories: {
      listPickable: vi.fn(async () => [
        { id: "food", name: "Food", user_id: null },
        { id: "hotel", name: "Accommodation", user_id: null },
        { id: "shop", name: "Shopping", user_id: null },
      ]),
      create,
    },
    plannedBudgets: { listForTrip: vi.fn(async () => opts.planned ?? []), upsert },
  };
  return { sdk: sdk as unknown as VacationBudgetSDK, upsert, create };
}

describe("applyBudgetPlan", () => {
  it("upserts each amount against the matching existing category, case-insensitively", async () => {
    const { sdk, upsert, create } = fakeSdk();
    const result = await applyBudgetPlan(sdk, "u1", TRIP, [
      { category: "food", amount: 1250 },
      { category: "Accommodation", amount: 1400 },
    ]);
    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(TRIP, "food", 1250);
    expect(upsert).toHaveBeenCalledWith(TRIP, "hotel", 1400);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates an unknown category as the user's own before planning it", async () => {
    const { sdk, upsert, create } = fakeSdk();
    await applyBudgetPlan(sdk, "u1", TRIP, [{ category: "Emergency", amount: 500 }]);
    expect(create).toHaveBeenCalledWith("u1", "Emergency");
    expect(upsert).toHaveBeenCalledWith(TRIP, "new-0", 500);
  });

  it("zeroes a previously planned category the new plan leaves out, so the saved total matches the preview", async () => {
    const { sdk, upsert } = fakeSdk({
      planned: [
        { category_id: "shop", planned_amount: 300 },
        { category_id: "food", planned_amount: 900 },
      ],
    });
    await applyBudgetPlan(sdk, "u1", TRIP, [{ category: "Food", amount: 1250 }]);
    expect(upsert).toHaveBeenCalledWith(TRIP, "shop", 0);
    expect(upsert).toHaveBeenCalledWith(TRIP, "food", 1250);
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it("refuses a trip the user doesn't own, writing nothing", async () => {
    const { sdk, upsert } = fakeSdk({ owned: false });
    expect(await applyBudgetPlan(sdk, "u1", TRIP, [{ category: "Food", amount: 1 }])).toEqual({ ok: false, reason: "forbidden" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each([[[]], [[{ category: "Food", amount: -5 }]], [[{ category: "", amount: 5 }]], ["not a plan"]])(
    "rejects invalid input %j before any write",
    async (input) => {
      const { sdk, upsert } = fakeSdk();
      expect(await applyBudgetPlan(sdk, "u1", TRIP, input)).toEqual({ ok: false, reason: "invalid" });
      expect(upsert).not.toHaveBeenCalled();
    },
  );

  it("reports a failed write instead of claiming success", async () => {
    const { sdk } = fakeSdk({ failUpsert: true });
    expect(await applyBudgetPlan(sdk, "u1", TRIP, [{ category: "Food", amount: 1 }])).toEqual({
      ok: false,
      reason: "write_failed",
    });
  });
});
