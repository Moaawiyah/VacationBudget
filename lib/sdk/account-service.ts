import { BaseService } from "./base-service";
import type { DbClient, WriteResult } from "./types";

/**
 * Deleting an account can't simply delete every row that names the user —
 * that would take a shared trip's history down with it (0017). Every
 * deletion here tombstones the profile (anonymized, never removed) rather
 * than hard-deleting it, so expenses/splits/settlements other people still
 * rely on keep a valid, non-personal reference. The one thing this refuses
 * outright is deleting a trip other people are actually in: that needs a
 * human decision (transfer it, or remove those people first), not an
 * automatic one.
 */
export class AccountService extends BaseService {
  constructor(
    db: DbClient,
    private readonly admin: DbClient | null,
  ) {
    super(db, "account");
  }

  /** Trip names this account owns that at least one other person is part of. */
  async ownedTripsWithOthers(userId: string): Promise<string[]> {
    if (!this.admin) return [];
    const { data: trips } = await this.admin
      .from("trips")
      .select("id, name")
      .eq("user_id", userId);
    if (!trips?.length) return [];
    const { data: members } = await this.admin
      .from("trip_members")
      .select("trip_id")
      .in(
        "trip_id",
        trips.map((t) => t.id),
      );
    const withMembers = new Set((members ?? []).map((m) => m.trip_id));
    return trips.filter((t) => withMembers.has(t.id)).map((t) => t.name);
  }

  async deleteAccount(userId: string): Promise<WriteResult & { blockedBy?: string[] }> {
    if (!this.admin) return { error: "Account deletion is unavailable" };

    const blocking = await this.ownedTripsWithOthers(userId);
    if (blocking.length) {
      return {
        error: "Transfer or delete these trips first, since other people are on them",
        code: "invalid_data",
        blockedBy: blocking,
      };
    }

    // Solo-owned trips have no shared history to preserve — cascade cleanup
    // is exactly right for these.
    await this.admin.from("trips").delete().eq("user_id", userId);
    // Leaves every trip this account was a member (not owner) of; those
    // trips' expenses/splits/settlements keep their history, now under the
    // tombstoned profile below.
    await this.admin.from("trip_members").delete().eq("user_id", userId);

    const { error } = await this.admin
      .from("profiles")
      .update({
        email: `deleted-${userId}@deleted.invalid`,
        username: null,
        first_name: null,
        surname: null,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) return this.fail("delete", error);

    // Disables login without touching the auth.users row — deleting it
    // would cascade and undo the tombstone just written (0001).
    await this.admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    await this.db.auth.signOut();
    this.invalidate();
    return {};
  }

  /**
   * Everything this account is entitled to see about itself — nothing
   * another user contributed. Deliberately queried with the request's own
   * (RLS-scoped) client, not the admin one: RLS is the same authorization
   * this data would get anywhere else in the app, so a mistake here fails
   * safely instead of leaking another trip's data.
   */
  async exportData(userId: string) {
    const { data: profile } = await this.db
      .from("profiles")
      .select("id, email, username, first_name, surname, created_at")
      .eq("id", userId)
      .single();
    const { data: trips } = await this.db
      .from("trips")
      .select("id, name, destination, start_date, end_date, base_currency, total_budget");
    const { data: expenses } = await this.db
      .from("expenses")
      .select("*")
      .or(`user_id.eq.${userId},paid_by.eq.${userId}`);
    const { data: splits } = await this.db
      .from("expense_splits")
      .select("*")
      .eq("user_id", userId);
    const { data: settlements } = await this.db
      .from("settlements")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    return {
      profile,
      trips: trips ?? [],
      expenses: expenses ?? [],
      expense_splits: splits ?? [],
      settlements: settlements ?? [],
    };
  }
}
