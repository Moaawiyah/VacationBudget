import { logger } from "@/lib/logger";
import { APP_ERROR_FALLBACK, classifyDbError } from "./errors";
import type { DbClient, WriteResult } from "./types";
import type { TripInvitation } from "@/types/companion";

type InvitationRow = {
  trip_id: string;
  user_id: string;
  invited_by: string;
  status: "pending" | "accepted";
  created_at: string;
};

export class InvitationService {
  constructor(protected readonly admin: DbClient | null) {}

  protected unavailable(): WriteResult {
    return { error: "Companion service is unavailable" };
  }

  /** Logs the raw database error; returns only a safe code and message. */
  protected failed(operation: string, error: { message: string; code?: string }) {
    const code = classifyDbError(error);
    logger.error(`companions.${operation} failed`, { error: error.message, code });
    return { error: APP_ERROR_FALLBACK[code], code };
  }

  async invitations(userId: string): Promise<TripInvitation[]> {
    if (!this.admin) return [];
    const { data } = await this.admin
      .from("trip_members")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as InvitationRow[];
    if (!rows.length) return [];
    const { data: trips } = await this.admin
      .from("trips")
      .select("id,name")
      .in(
        "id",
        rows.map((row) => row.trip_id),
      );
    const { data: inviters } = await this.admin
      .from("profiles")
      .select("id,username")
      .in(
        "id",
        rows.map((row) => row.invited_by),
      );
    const tripMap = new Map((trips ?? []).map((trip) => [trip.id, trip.name]));
    const inviterMap = new Map(
      (inviters ?? []).map((profile) => [profile.id, profile.username ?? ""]),
    );
    return rows.map((row) => ({
      tripId: row.trip_id,
      tripName: tripMap.get(row.trip_id) ?? "Trip",
      inviterUsername: inviterMap.get(row.invited_by) ?? "",
      createdAt: row.created_at,
    }));
  }

  async respond(userId: string, tripId: string, accept: boolean): Promise<WriteResult> {
    if (!this.admin) return this.unavailable();
    const query = this.admin.from("trip_members");
    const { error } = accept
      ? await query
          .update({ status: "accepted", responded_at: new Date().toISOString() })
          .eq("trip_id", tripId)
          .eq("user_id", userId)
          .eq("status", "pending")
      : await query
          .delete()
          .eq("trip_id", tripId)
          .eq("user_id", userId)
          .eq("status", "pending");
    return error ? this.failed("respond", error) : {};
  }
}
