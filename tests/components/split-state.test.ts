import { describe, expect, it } from "vitest";
import { splitStateFromExpense } from "@/components/expenses/split-state";
import { ExpenseService } from "@/lib/sdk/expense-service";
import { callsOf, createFakeDb } from "../helpers/fake-db";

describe("splitStateFromExpense — the edit form starts from what was saved", () => {
  it("restores payer, method and each exact share", () => {
    const state = splitStateFromExpense({ paid_by: "alex", split_method: "exact" }, [
      { userId: "alex", shareAmount: 30, sharePercent: null },
      { userId: "moa", shareAmount: 70, sharePercent: null },
    ]);
    expect(state).toEqual({
      enabled: true,
      paidBy: "alex",
      method: "exact",
      participantIds: ["alex", "moa"],
      exactAmounts: { alex: 30, moa: 70 },
      percentages: {},
    });
  });

  it("restores percentages for a percentage split", () => {
    const state = splitStateFromExpense({ paid_by: "moa", split_method: "percentage" }, [
      { userId: "moa", shareAmount: 25, sharePercent: 25 },
      { userId: "john", shareAmount: 75, sharePercent: 75 },
    ]);
    expect(state.method).toBe("percentage");
    expect(state.percentages).toEqual({ moa: 25, john: 75 });
  });

  it("keeps an equal split's participants", () => {
    const state = splitStateFromExpense({ paid_by: "moa", split_method: "equal" }, [
      { userId: "moa", shareAmount: 50, sharePercent: null },
      { userId: "alex", shareAmount: 50, sharePercent: null },
    ]);
    expect(state).toMatchObject({ enabled: true, method: "equal", participantIds: ["moa", "alex"] });
  });

  it("treats a single 100% share for the payer as unsplit — but keeps who paid", () => {
    const state = splitStateFromExpense({ paid_by: "alex", split_method: "equal" }, [
      { userId: "alex", shareAmount: 100, sharePercent: null },
    ]);
    expect(state).toMatchObject({ enabled: false, paidBy: "alex" });
  });

  it("keeps the real payer even when someone else (e.g. the trip owner) is editing", () => {
    // The old form always started from the editor as payer, silently reassigning it on save.
    const state = splitStateFromExpense({ paid_by: "member", split_method: "equal" }, []);
    expect(state.paidBy).toBe("member");
  });

  it("shows a one-person share held by someone other than the payer as a split", () => {
    const state = splitStateFromExpense({ paid_by: "moa", split_method: "exact" }, [
      { userId: "alex", shareAmount: 40, sharePercent: null },
    ]);
    expect(state).toMatchObject({ enabled: true, participantIds: ["alex"] });
  });
});

describe("ExpenseService.getSplits", () => {
  it("reads one expense's shares and normalizes numeric columns", async () => {
    const { db, calls } = createFakeDb({
      expense_splits: [
        {
          data: [
            { user_id: "moa", share_amount: "25.00", share_percent: "25.00" },
            { user_id: "john", share_amount: "75.00", share_percent: null },
          ],
        },
      ],
    });
    expect(await new ExpenseService(db).getSplits("e1")).toEqual([
      { userId: "moa", shareAmount: 25, sharePercent: 25 },
      { userId: "john", shareAmount: 75, sharePercent: null },
    ]);
    expect(callsOf(calls, "expense_splits", "eq")).toEqual([["expense_id", "e1"]]);
  });
});
