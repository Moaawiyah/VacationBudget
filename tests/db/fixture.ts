import type { PGlite } from "@electric-sql/pglite";
import { asUser, createDb, createUser, uid } from "./harness";

export const OWNER = uid(0xa);
export const MEMBER = uid(0xb);
export const STRANGER = uid(0xc);
export const TRIP = uid(0x100);
export const OTHER_TRIP = uid(0x200);

export type Scenario = { db: PGlite; systemCategory: string };

/**
 * OWNER owns TRIP (EUR) and OTHER_TRIP; MEMBER was invited to TRIP and
 * accepted; STRANGER has no relationship to either. Every step goes through
 * the same RLS path the app's users hit — nothing is inserted as superuser
 * except the auth.users rows Supabase Auth itself would create.
 */
export async function sharedTripScenario(): Promise<Scenario> {
  const db = await createDb();
  await createUser(db, OWNER, "owner");
  await createUser(db, MEMBER, "member");
  await createUser(db, STRANGER, "stranger");

  await asUser(db, OWNER, async () => {
    for (const id of [TRIP, OTHER_TRIP]) {
      await db.query(
        `insert into public.trips
           (id, user_id, name, destination, start_date, end_date, base_currency, total_budget)
         values ($1, $2, 'Trip', 'IT', '2026-06-01', '2026-06-10', 'EUR', 1000)`,
        [id, OWNER],
      );
    }
    await db.query(
      "insert into public.trip_members (trip_id, user_id, invited_by) values ($1, $2, $3)",
      [TRIP, MEMBER, OWNER],
    );
  });
  await asUser(db, MEMBER, () =>
    db.query(
      `update public.trip_members set status = 'accepted', responded_at = now()
       where trip_id = $1 and user_id = $2`,
      [TRIP, MEMBER],
    ),
  );

  const { rows } = await db.query<{ id: string }>(
    "select id from public.categories where user_id is null order by name limit 1",
  );
  return { db, systemCategory: rows[0].id };
}

/** Inserts an expense as `userId` and returns its id. */
export async function addExpense(
  db: PGlite,
  userId: string,
  categoryId: string,
  fields: { tripId?: string; amount?: number; currency?: string; rate?: number } = {},
): Promise<string> {
  return asUser(db, userId, async () => {
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
        fields.amount ?? 20,
        fields.currency ?? "EUR",
        fields.rate ?? 1,
      ],
    );
    return rows[0].id;
  });
}
