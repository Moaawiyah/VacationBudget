import { beforeEach, describe, expect, it } from "vitest";
import { errorCode } from "./harness";
import { addSplitExpense, MEMBER, OTHER_MEMBER, OWNER, sharedTripScenario, type Scenario } from "./fixture";

let s: Scenario;
beforeEach(async () => {
  s = await sharedTripScenario();
});

describe("expense_splits — amount invariants (VB003)", () => {
  it("rejects shares that fall short of the total", async () => {
    const code = await errorCode(() =>
      addSplitExpense(s.db, OWNER, s.systemCategory, {
        amount: 100,
        splits: [
          { userId: OWNER, shareAmount: 50 },
          { userId: MEMBER, shareAmount: 40 },
        ],
      }),
    );
    expect(code).toBe("VB003");
  });

  it("rejects shares that exceed the total", async () => {
    const code = await errorCode(() =>
      addSplitExpense(s.db, OWNER, s.systemCategory, {
        amount: 100,
        splits: [
          { userId: OWNER, shareAmount: 60 },
          { userId: MEMBER, shareAmount: 60 },
        ],
      }),
    );
    expect(code).toBe("VB003");
  });

  it("accepts a three-way €100 split that reconciles to the cent (33.33/33.33/33.34)", async () => {
    const code = await errorCode(() =>
      addSplitExpense(s.db, OWNER, s.systemCategory, {
        amount: 100,
        splitMethod: "exact",
        splits: [
          { userId: OWNER, shareAmount: 33.33 },
          { userId: MEMBER, shareAmount: 33.33 },
          { userId: OTHER_MEMBER, shareAmount: 33.34 },
        ],
      }),
    );
    expect(code).toBeNull();
  });
});

describe("expense_splits — percentage invariants (VB004)", () => {
  it("accepts percentages that add up to exactly 100, including 33.33/33.33/33.34", async () => {
    const code = await errorCode(() =>
      addSplitExpense(s.db, OWNER, s.systemCategory, {
        amount: 100,
        splitMethod: "percentage",
        splits: [
          { userId: OWNER, shareAmount: 33.33, sharePercent: 33.33 },
          { userId: MEMBER, shareAmount: 33.33, sharePercent: 33.33 },
          { userId: OTHER_MEMBER, shareAmount: 33.34, sharePercent: 33.34 },
        ],
      }),
    );
    expect(code).toBeNull();
  });

  it("rejects percentages summing to only 95%, even when the amounts happen to total correctly", async () => {
    const code = await errorCode(() =>
      addSplitExpense(s.db, OWNER, s.systemCategory, {
        amount: 100,
        splitMethod: "percentage",
        splits: [
          { userId: OWNER, shareAmount: 65, sharePercent: 60 },
          { userId: MEMBER, shareAmount: 35, sharePercent: 35 },
        ],
      }),
    );
    expect(code).toBe("VB004");
  });

  it("rejects a share amount that doesn't match its stated percentage", async () => {
    const code = await errorCode(() =>
      addSplitExpense(s.db, OWNER, s.systemCategory, {
        amount: 100,
        splitMethod: "percentage",
        splits: [
          { userId: OWNER, shareAmount: 90, sharePercent: 50 },
          { userId: MEMBER, shareAmount: 10, sharePercent: 50 },
        ],
      }),
    );
    expect(code).toBe("VB004");
  });
});

describe("expense_splits — equal-split invariant (VB005)", () => {
  it("rejects an 'equal' split whose shares actually differ by more than a cent", async () => {
    const code = await errorCode(() =>
      addSplitExpense(s.db, OWNER, s.systemCategory, {
        amount: 100,
        splitMethod: "equal",
        splits: [
          { userId: OWNER, shareAmount: 80 },
          { userId: MEMBER, shareAmount: 20 },
        ],
      }),
    );
    expect(code).toBe("VB005");
  });
});

describe("expense_splits — structural constraints", () => {
  it("the primary key rejects a duplicate participant outright", async () => {
    const code = await errorCode(() =>
      addSplitExpense(s.db, OWNER, s.systemCategory, {
        amount: 100,
        splits: [
          { userId: OWNER, shareAmount: 50 },
          { userId: OWNER, shareAmount: 50 },
        ],
      }),
    );
    expect(code).toBe("23505"); // duplicate primary key (expense_id, user_id)
  });

  it("a check constraint rejects a negative share", async () => {
    const code = await errorCode(() =>
      addSplitExpense(s.db, OWNER, s.systemCategory, {
        amount: 100,
        splits: [
          { userId: OWNER, shareAmount: 120 },
          { userId: MEMBER, shareAmount: -20 },
        ],
      }),
    );
    expect(code).toBe("23514");
  });

  it("JPY rejects a share finer than a whole yen (VB007)", async () => {
    const code = await errorCode(() =>
      addSplitExpense(s.db, OWNER, s.systemCategory, {
        amount: 1000,
        currency: "JPY",
        splitMethod: "exact",
        splits: [
          { userId: OWNER, shareAmount: 500.5 },
          { userId: MEMBER, shareAmount: 499.5 },
        ],
      }),
    );
    expect(code).toBe("VB007");
  });
});
