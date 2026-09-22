import type { TripInput } from "@/lib/validation/trip";
import { toCoverColumns } from "@/lib/images/cover-schema";
import { toTrip, type Trip } from "@/types/trip";
import { BaseService } from "./base-service";
import type { AppErrorCode } from "./errors";
import type { DbClient, WriteResult } from "./types";

export type TripWithSpent = { trip: Trip; spent: number; isOwner: boolean };

/** Column values for a trip row, from already-validated form input. */
export function toTripRow(input: TripInput) {
  return {
    name: input.name,
    description: input.description || null,
    destination: input.destination,
    start_date: input.start_date,
    end_date: input.end_date,
    base_currency: input.base_currency,
    total_budget: input.total_budget,
    ...(input.cover !== undefined && toCoverColumns(input.cover)),
  };
}

/**
 * Trips. Reads rely on Row Level Security to return owned trips and trips the
 * signed-in user has accepted. Owner-only writes are scoped explicitly.
 */
export class TripService extends BaseService {
  constructor(db: DbClient) {
    super(db, "trips");
  }

  get(id: string): Promise<Trip | null> {
    return this.memo(`trip:${id}`, async () => {
      const { data } = await this.db.from("trips").select("*").eq("id", id).single();
      return data ? toTrip(data) : null;
    });
  }

  /**
   * Accessible trips, soonest first, each with its total converted spend.
   * Two queries in total — not one per trip — however many trips there are.
   */
  async listWithSpent(_userId: string): Promise<TripWithSpent[]> {
    const { data: rows } = await this.db
      .from("trips")
      .select("*")
      .order("start_date", { ascending: true });
    const trips = (rows ?? []).map(toTrip);
    if (trips.length === 0) return [];

    const { data: expenseRows } = await this.db
      .from("expenses")
      .select("trip_id, converted_amount")
      .in(
        "trip_id",
        trips.map((trip) => trip.id),
      );
    const spent = new Map<string, number>();
    for (const row of expenseRows ?? []) {
      spent.set(
        row.trip_id,
        (spent.get(row.trip_id) ?? 0) + Number(row.converted_amount),
      );
    }
    return trips.map((trip) => ({
      trip,
      spent: spent.get(trip.id) ?? 0,
      isOwner: trip.user_id === _userId,
    }));
  }

  /** Base currency of a trip `userId` owns; null if it isn't theirs or doesn't exist. */
  async ownedBaseCurrency(userId: string, tripId: string): Promise<string | null> {
    const { data } = await this.db
      .from("trips")
      .select("base_currency")
      .eq("id", tripId)
      .eq("user_id", userId)
      .single();
    return data?.base_currency ?? null;
  }

  /** Base currency for an owner or accepted companion; RLS decides access. */
  async accessibleBaseCurrency(tripId: string): Promise<string | null> {
    const { data } = await this.db
      .from("trips")
      .select("base_currency")
      .eq("id", tripId)
      .single();
    return data?.base_currency ?? null;
  }

  /** Whether `userId` owns the trip (gives actions a clean "not found" error). */
  async isOwnedBy(userId: string, tripId: string): Promise<boolean> {
    return (await this.ownedBaseCurrency(userId, tripId)) !== null;
  }

  async create(
    userId: string,
    input: TripInput,
  ): Promise<{ id: string } | { error: string; code?: AppErrorCode }> {
    const { data, error } = await this.db
      .from("trips")
      // user_id always comes from the session, never from the form.
      .insert({ user_id: userId, ...toTripRow(input) })
      .select("id")
      .single();
    if (error || !data)
      return this.fail("create", error ?? { message: "No trip returned" });
    this.invalidate();
    return { id: data.id };
  }

  async update(userId: string, tripId: string, input: TripInput): Promise<WriteResult> {
    const { data, error } = await this.db
      .from("trips")
      .update(toTripRow(input))
      .eq("id", tripId)
      .eq("user_id", userId)
      .select("id");
    if (error) return this.fail("update", error);
    // Zero rows = not the owner (or no such trip): say so, rather than
    // letting a refused edit look saved.
    if (!data?.length)
      return this.fail("update", { message: "no row matched" }, "permission_denied");
    this.invalidate();
    return {};
  }

  async delete(userId: string, tripId: string): Promise<WriteResult> {
    const { data, error } = await this.db
      .from("trips")
      .delete()
      .eq("id", tripId)
      .eq("user_id", userId)
      .select("id");
    if (error) return this.fail("delete", error);
    if (!data?.length)
      return this.fail("delete", { message: "no row matched" }, "permission_denied");
    this.invalidate();
    return {};
  }
}
