import type { WriteResult } from "./types";
import type { Companion } from "@/types/companion";
import { InvitationService } from "./invitation-service";

type MemberRow = {
  trip_id: string;
  user_id: string;
  invited_by: string;
  status: "pending" | "accepted";
  created_at: string;
};
type ProfileRow = {
  id: string;
  username: string | null;
  first_name: string | null;
  surname: string | null;
};

export class CompanionService extends InvitationService {
  async invite(
    ownerId: string,
    tripId: string,
    username: string,
  ): Promise<WriteResult & { code?: string }> {
    if (!this.admin) return this.unavailable();
    const normalized = username.trim().toLowerCase();
    const { data: trips } = await this.admin
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .eq("user_id", ownerId)
      .limit(1);
    if (!trips?.length) return { error: "Trip not found", code: "trip_not_found" };
    const { data: profiles } = await this.admin
      .from("profiles")
      .select("id")
      .eq("username", normalized)
      .limit(1);
    const invited = profiles?.[0];
    if (!invited) return { error: "Username not found", code: "user_not_found" };
    if (invited.id === ownerId)
      return { error: "You are already the trip owner", code: "self" };
    const { data: existing } = await this.admin
      .from("trip_members")
      .select("status")
      .eq("trip_id", tripId)
      .eq("user_id", invited.id)
      .limit(1);
    if (existing?.length)
      return { error: "This user is already invited", code: "already_invited" };
    const { error } = await this.admin.from("trip_members").insert({
      trip_id: tripId,
      user_id: invited.id,
      invited_by: ownerId,
      status: "pending",
    });
    return error ? { error: error.message } : {};
  }

  async listForTrip(
    requesterId: string,
    tripId: string,
  ): Promise<{ companions: Companion[]; isOwner: boolean } | { error: string }> {
    if (!this.admin) return this.unavailable() as { error: string };
    const { data: trips } = await this.admin
      .from("trips")
      .select("user_id")
      .eq("id", tripId)
      .limit(1);
    const ownerId = trips?.[0]?.user_id;
    if (!ownerId) return { error: "Trip not found" };
    const { data: rows } = await this.admin
      .from("trip_members")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at");
    const members = (rows ?? []) as MemberRow[];
    const accepted = members.some(
      (member) => member.user_id === requesterId && member.status === "accepted",
    );
    if (requesterId !== ownerId && !accepted) return { error: "Trip not found" };
    const ids = [ownerId, ...members.map((member) => member.user_id)];
    const { data: profiles } = await this.admin
      .from("profiles")
      .select("id,username,first_name,surname")
      .in("id", ids);
    const byId = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
    );
    const person = (id: string, status: Companion["status"]): Companion => {
      const profile = byId.get(id);
      return {
        userId: id,
        username: profile?.username ?? "",
        firstName: profile?.first_name ?? "",
        surname: profile?.surname ?? "",
        status,
      };
    };
    return {
      isOwner: requesterId === ownerId,
      companions: [
        person(ownerId, "owner"),
        ...members.map((member) => person(member.user_id, member.status)),
      ],
    };
  }

  async remove(ownerId: string, tripId: string, userId: string): Promise<WriteResult> {
    if (!this.admin) return this.unavailable();
    const { data: trips } = await this.admin
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .eq("user_id", ownerId)
      .limit(1);
    if (!trips?.length) return { error: "Trip not found" };
    const { error } = await this.admin
      .from("trip_members")
      .delete()
      .eq("trip_id", tripId)
      .eq("user_id", userId);
    return error ? { error: error.message } : {};
  }
}
