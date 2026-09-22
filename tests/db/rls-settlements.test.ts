import { beforeEach, describe, expect, it } from "vitest";
import { asUser, errorCode } from "./harness";
import {
  MEMBER,
  OTHER_MEMBER,
  OWNER,
  recordSettlement,
  sharedTripScenario,
  STRANGER,
  TRIP,
  type Scenario,
} from "./fixture";

let s: Scenario;
beforeEach(async () => {
  s = await sharedTripScenario();
});

describe("settlements — who may record one", () => {
  it("a party to the transfer may record it themselves", async () => {
    const id = await recordSettlement(s.db, MEMBER, {
      fromUserId: MEMBER,
      toUserId: OWNER,
      amount: 20,
    });
    expect(id).toBeTruthy();
  });

  it("the trip owner may record a transfer between two other members", async () => {
    const id = await recordSettlement(s.db, OWNER, {
      fromUserId: MEMBER,
      toUserId: OTHER_MEMBER,
      amount: 15,
    });
    expect(id).toBeTruthy();
  });

  it("a member cannot record a transfer between two other people", async () => {
    const code = await errorCode(() =>
      recordSettlement(s.db, MEMBER, {
        fromUserId: OWNER,
        toUserId: OTHER_MEMBER,
        amount: 15,
      }),
    );
    expect(code).not.toBeNull();
  });

  it("a stranger cannot record a settlement on this trip", async () => {
    const code = await errorCode(() =>
      recordSettlement(s.db, STRANGER, {
        fromUserId: MEMBER,
        toUserId: OWNER,
        amount: 20,
      }),
    );
    expect(code).not.toBeNull();
  });

  it("both parties must be trip participants", async () => {
    const code = await errorCode(() =>
      recordSettlement(s.db, OWNER, {
        fromUserId: OWNER,
        toUserId: STRANGER,
        amount: 20,
      }),
    );
    expect(code).toBe("VB006");
  });
});

describe("settlements — visibility", () => {
  it("every trip participant can see it; a stranger cannot", async () => {
    const id = await recordSettlement(s.db, MEMBER, {
      fromUserId: MEMBER,
      toUserId: OWNER,
      amount: 20,
    });
    for (const user of [OWNER, MEMBER, OTHER_MEMBER]) {
      const { rows } = await asUser(s.db, user, () =>
        s.db.query("select id from public.settlements where id = $1", [id]),
      );
      expect(rows).toHaveLength(1);
    }
    const { rows } = await asUser(s.db, STRANGER, () =>
      s.db.query("select id from public.settlements where id = $1", [id]),
    );
    expect(rows).toHaveLength(0);
  });
});

describe("settlements — validation and idempotency", () => {
  it("rejects a zero or negative amount", async () => {
    const code = await errorCode(() =>
      recordSettlement(s.db, MEMBER, { fromUserId: MEMBER, toUserId: OWNER, amount: 0 }),
    );
    expect(code).toBe("23514");
  });

  it("rejects paying yourself", async () => {
    const code = await errorCode(() =>
      recordSettlement(s.db, MEMBER, { fromUserId: MEMBER, toUserId: MEMBER, amount: 10 }),
    );
    expect(code).toBe("23514");
  });

  it("a repeated 'mark paid' tap returns the same settlement instead of duplicating it", async () => {
    const requestId = "44444444-4444-4444-4444-444444444444";
    const first = await recordSettlement(s.db, MEMBER, {
      fromUserId: MEMBER,
      toUserId: OWNER,
      amount: 20,
      requestId,
    });
    const second = await recordSettlement(s.db, MEMBER, {
      fromUserId: MEMBER,
      toUserId: OWNER,
      amount: 20,
      requestId,
    });
    expect(second).toBe(first);
    const { rows } = await asUser(s.db, OWNER, () =>
      s.db.query("select id from public.settlements where trip_id = $1", [TRIP]),
    );
    expect(rows).toHaveLength(1);
  });

  it("the owner may delete a mistaken settlement", async () => {
    const id = await recordSettlement(s.db, MEMBER, {
      fromUserId: MEMBER,
      toUserId: OWNER,
      amount: 20,
    });
    const result = await asUser(s.db, OWNER, () =>
      s.db.query("delete from public.settlements where id = $1", [id]),
    );
    expect(result.affectedRows).toBe(1);
  });

  it("an uninvolved member cannot delete someone else's settlement", async () => {
    const id = await recordSettlement(s.db, MEMBER, {
      fromUserId: MEMBER,
      toUserId: OWNER,
      amount: 20,
    });
    const result = await asUser(s.db, OTHER_MEMBER, () =>
      s.db.query("delete from public.settlements where id = $1", [id]),
    );
    expect(result.affectedRows).toBe(0);
  });
});
