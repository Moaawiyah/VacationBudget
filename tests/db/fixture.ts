import type { PGlite } from "@electric-sql/pglite";
import { asUser, createDb, createUser, uid } from "./harness";

export const OWNER = uid(0xa);
export const MEMBER = uid(0xb);
export const STRANGER = uid(0xc);
export const OTHER_MEMBER = uid(0xd);
export const TRIP = uid(0x100);
export const OTHER_TRIP = uid(0x200);

export type Scenario = { db: PGlite; systemCategory: string };

/**
 * OWNER owns TRIP (EUR) and OTHER_TRIP; MEMBER and OTHER_MEMBER were invited
 * to TRIP and accepted; STRANGER has no relationship to either. Every step
 * goes through the same RLS path the app's users hit — nothing is inserted
 * as superuser except the auth.users rows Supabase Auth itself would create.
 */
export async function sharedTripScenario(): Promise<Scenario> {
  const db = await createDb();
  await createUser(db, OWNER, "owner");
  await createUser(db, MEMBER, "member");
  await createUser(db, STRANGER, "stranger");
  await createUser(db, OTHER_MEMBER, "other_member");

  await asUser(db, OWNER, async () => {
    for (const id of [TRIP, OTHER_TRIP]) {
      await db.query(
        `insert into public.trips
           (id, user_id, name, destination, start_date, end_date, base_currency, total_budget)
         values ($1, $2, 'Trip', 'IT', '2026-06-01', '2026-06-10', 'EUR', 1000)`,
        [id, OWNER],
      );
    }
    for (const member of [MEMBER, OTHER_MEMBER]) {
      await db.query(
        "insert into public.trip_members (trip_id, user_id, invited_by) values ($1, $2, $3)",
        [TRIP, member, OWNER],
      );
    }
  });
  for (const member of [MEMBER, OTHER_MEMBER]) {
    await asUser(db, member, () =>
      db.query(
        `update public.trip_members set status = 'accepted', responded_at = now()
         where trip_id = $1 and user_id = $2`,
        [TRIP, member],
      ),
    );
  }

  const { rows } = await db.query<{ id: string }>(
    "select id from public.categories where user_id is null order by name limit 1",
  );
  return { db, systemCategory: rows[0].id };
}

/**
 * Inserts an expense (as `userId`) and returns its id. The split invariant
 * is checked at commit, so the matching 100%-share row for the payer goes in
 * the same explicit transaction — exactly what create_expense does atomically
 * on the app's behalf.
 */
export async function addExpense(
  db: PGlite,
  userId: string,
  categoryId: string,
  fields: { tripId?: string; amount?: number; currency?: string; rate?: number } = {},
): Promise<string> {
  const amount = fields.amount ?? 20;
  return asUser(db, userId, async () => {
    await db.exec("begin");
    try {
      const { rows } = await db.query<{ id: string }>(
        `insert into public.expenses
           (trip_id, user_id, category_id, amount, currency, exchange_rate,
            converted_amount, description, expense_date)
         values ($1, $2, $3, $4, $5, $6, 0, 'Lunch', '2026-06-02')
         returning id`,
        [
          fields.tripId ?? TRIP,
          userId,
          categoryId,
          amount,
          fields.currency ?? "EUR",
          fields.rate ?? 1,
        ],
      );
      await db.query(
        "insert into public.expense_splits (expense_id, user_id, share_amount) values ($1, $2, $3)",
        [rows[0].id, userId, amount],
      );
      await db.exec("commit");
      return rows[0].id;
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
  });
}

/**
 * Creates an expense with an explicit split via the public.create_expense
 * RPC — the same atomic, idempotent path the app's Server Action uses, so
 * these tests exercise exactly what production calls.
 */
export async function addSplitExpense(
  db: PGlite,
  authorId: string,
  categoryId: string,
  opts: {
    tripId?: string;
    amount?: number;
    currency?: string;
    paidBy?: string;
    splitMethod?: "equal" | "exact" | "percentage";
    splits: { userId: string; shareAmount: number; sharePercent?: number }[];
    requestId?: string;
  },
): Promise<string> {
  return asUser(db, authorId, async () => {
    const { rows } = await db.query<{ create_expense: string }>(
      "select public.create_expense($1, $2, $3, $4) as create_expense",
      [
        opts.tripId ?? TRIP,
        JSON.stringify({
          category_id: categoryId,
          amount: opts.amount ?? 20,
          currency: opts.currency ?? "EUR",
          exchange_rate: 1,
          description: "Dinner",
          expense_date: "2026-06-02",
          paid_by: opts.paidBy ?? authorId,
          split_method: opts.splitMethod ?? "equal",
        }),
        JSON.stringify(
          opts.splits.map((s) => ({
            user_id: s.userId,
            share_amount: s.shareAmount,
            share_percent: s.sharePercent ?? null,
          })),
        ),
        opts.requestId ?? null,
      ],
    );
    return rows[0].create_expense;
  });
}

/** Records a settlement via the public.record_settlement RPC, as `asUserId`. */
export async function recordSettlement(
  db: PGlite,
  asUserId: string,
  opts: {
    tripId?: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    note?: string;
    requestId?: string;
  },
): Promise<string> {
  return asUser(db, asUserId, async () => {
    const { rows } = await db.query<{ record_settlement: string }>(
      "select public.record_settlement($1, $2, $3, $4, $5, $6) as record_settlement",
      [
        opts.tripId ?? TRIP,
        opts.fromUserId,
        opts.toUserId,
        opts.amount,
        opts.note ?? null,
        opts.requestId ?? null,
      ],
    );
    return rows[0].record_settlement;
  });
}
