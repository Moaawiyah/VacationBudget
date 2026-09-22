import { BaseService } from "./base-service";
import type { DbClient, WriteResult } from "./types";

export type Settlement = {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note: string | null;
  createdBy: string;
  createdAt: string;
};

/**
 * Settlements are their own domain model, not an expense (0015): recording
 * that a real-world payment happened, never what anything cost. "Suggested"
 * transfers (lib/finance/settlement.ts) are computed live from balances and
 * never stored here — only a confirmed "Mark Paid" becomes a row.
 */
export class SettlementService extends BaseService {
  constructor(db: DbClient) {
    super(db, "settlements");
  }

  listForTrip(tripId: string): Promise<Settlement[]> {
    return this.memo(`trip:${tripId}`, async () => {
      const { data } = await this.db
        .from("settlements")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      return (data ?? []).map((row) => ({
        id: row.id,
        fromUserId: row.from_user_id,
        toUserId: row.to_user_id,
        amount: Number(row.amount),
        note: row.note,
        createdBy: row.created_by,
        createdAt: row.created_at,
      }));
    });
  }

  /**
   * `requestId` protects a "Mark Paid" tap the same way expense creation
   * does — record_settlement (0015) returns the existing row for a repeat
   * instead of recording the transfer twice.
   */
  async record(
    tripId: string,
    fromUserId: string,
    toUserId: string,
    amount: number,
    requestId?: string,
  ): Promise<WriteResult> {
    const { error } = await this.db.rpc("record_settlement", {
      p_trip_id: tripId,
      p_from_user_id: fromUserId,
      p_to_user_id: toUserId,
      p_amount: amount,
      p_request_id: requestId ?? null,
    });
    if (error) return this.fail("record", error);
    this.invalidate();
    return {};
  }

  async remove(settlementId: string): Promise<WriteResult> {
    const { data, error } = await this.db
      .from("settlements")
      .delete()
      .eq("id", settlementId)
      .select("id");
    if (error) return this.fail("remove", error);
    if (!data?.length) {
      return this.fail(
        "remove",
        { message: "no row matched: not permitted or not found" },
        "permission_denied",
      );
    }
    this.invalidate();
    return {};
  }
}
