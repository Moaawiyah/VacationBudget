import { describe, expect, it } from "vitest";
import { CompanionService } from "@/lib/sdk/companion-service";
import { callsOf, createFakeDb } from "../helpers/fake-db";

describe("CompanionService invitations", () => {
  it("finds a registered username and creates a pending invitation", async () => {
    const admin = createFakeDb({
      trips: [{ data: [{ id: "trip-1" }] }],
      profiles: [{ data: [{ id: "user-2" }] }],
      trip_members: [{ data: [] }, {}],
    });
    expect(
      await new CompanionService(admin.db).invite("user-1", "trip-1", " Friend "),
    ).toEqual({});
    expect(callsOf(admin.calls, "profiles", "eq")).toContainEqual(["username", "friend"]);
    expect(callsOf(admin.calls, "trip_members", "insert")[0]).toEqual([
      { trip_id: "trip-1", user_id: "user-2", invited_by: "user-1", status: "pending" },
    ]);
  });

  it("returns clear codes for an unknown, self, or already invited user", async () => {
    const unknown = createFakeDb({
      trips: [{ data: [{ id: "trip-1" }] }],
      profiles: [{ data: [] }],
    });
    expect(
      await new CompanionService(unknown.db).invite("user-1", "trip-1", "missing"),
    ).toMatchObject({ code: "user_not_found" });
    const self = createFakeDb({
      trips: [{ data: [{ id: "trip-1" }] }],
      profiles: [{ data: [{ id: "user-1" }] }],
    });
    expect(
      await new CompanionService(self.db).invite("user-1", "trip-1", "owner"),
    ).toMatchObject({ code: "self" });
    const duplicate = createFakeDb({
      trips: [{ data: [{ id: "trip-1" }] }],
      profiles: [{ data: [{ id: "user-2" }] }],
      trip_members: [{ data: [{ status: "pending" }] }],
    });
    expect(
      await new CompanionService(duplicate.db).invite("user-1", "trip-1", "friend"),
    ).toMatchObject({ code: "already_invited" });
  });

  it("lists pending invitations with trip and inviter details", async () => {
    const admin = createFakeDb({
      trip_members: [
        {
          data: [
            {
              trip_id: "trip-1",
              user_id: "user-2",
              invited_by: "user-1",
              status: "pending",
              created_at: "2026-01-01",
            },
          ],
        },
      ],
      trips: [{ data: [{ id: "trip-1", name: "Alps" }] }],
      profiles: [{ data: [{ id: "user-1", username: "owner" }] }],
    });
    expect(await new CompanionService(admin.db).invitations("user-2")).toEqual([
      {
        tripId: "trip-1",
        tripName: "Alps",
        inviterUsername: "owner",
        createdAt: "2026-01-01",
      },
    ]);
  });

  it("accepts or ignores an invitation for only the signed-in invitee", async () => {
    const admin = createFakeDb({ trip_members: [{}, {}] });
    const service = new CompanionService(admin.db);
    expect(await service.respond("user-2", "trip-1", true)).toEqual({});
    expect(await service.respond("user-2", "trip-2", false)).toEqual({});
    expect(callsOf(admin.calls, "trip_members", "update")).toHaveLength(1);
    expect(callsOf(admin.calls, "trip_members", "delete")).toHaveLength(1);
    expect(callsOf(admin.calls, "trip_members", "eq")).toContainEqual([
      "user_id",
      "user-2",
    ]);
  });
});

describe("CompanionService trip list", () => {
  it("shows pending companions faded by status and accepted companions normally", async () => {
    const admin = createFakeDb({
      trips: [{ data: [{ user_id: "user-1" }] }],
      trip_members: [
        {
          data: [
            {
              trip_id: "trip-1",
              user_id: "user-2",
              invited_by: "user-1",
              status: "pending",
              created_at: "1",
            },
            {
              trip_id: "trip-1",
              user_id: "user-3",
              invited_by: "user-1",
              status: "accepted",
              created_at: "2",
            },
          ],
        },
      ],
      profiles: [
        {
          data: [
            { id: "user-1", username: "owner", first_name: "Trip", surname: "Owner" },
            { id: "user-2", username: "pending", first_name: "Pat", surname: "Pending" },
            {
              id: "user-3",
              username: "accepted",
              first_name: "Alex",
              surname: "Accepted",
            },
          ],
        },
      ],
    });
    const result = await new CompanionService(admin.db).listForTrip("user-1", "trip-1");
    expect(result).toMatchObject({
      isOwner: true,
      companions: [{ status: "owner" }, { status: "pending" }, { status: "accepted" }],
    });
  });
});
