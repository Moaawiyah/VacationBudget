import { describe, expect, it } from "vitest";
import { TripService, toTripRow } from "@/lib/sdk/trip-service";
import { tripSchema } from "@/lib/validation/trip";
import en from "@/lib/i18n/dictionaries/en";
import type { TripCover } from "@/lib/images/cover-schema";
import { callsOf, createFakeDb, muteErrorLog } from "../helpers/fake-db";
import { tripInput } from "../helpers/fixtures";

const cover: TripCover = {
  url: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&w=1600",
  alt: "Lake",
  provider: "pexels",
  photographer: "Jane",
  photographerUrl: "https://www.pexels.com/@jane",
  sourceUrl: "https://www.pexels.com/photo/1/",
};

describe("trip cover persistence", () => {
  it("stores the selected cover's metadata with the new trip", async () => {
    const { db, calls } = createFakeDb({ trips: [{}] });
    await new TripService(db).create("user-1", { ...tripInput, cover });
    const [inserted] = callsOf(calls, "trips", "insert")[0] as [Record<string, unknown>];
    expect(inserted).toMatchObject({
      cover_image_url: cover.url,
      cover_image_alt: "Lake",
      cover_provider: "pexels",
      cover_photographer: "Jane",
      cover_photographer_url: cover.photographerUrl,
      cover_source_url: cover.sourceUrl,
    });
  });

  it("clears every cover column when the default cover is chosen", () => {
    const row = toTripRow({ ...tripInput, cover: null });
    expect(row).toMatchObject({ cover_image_url: null, cover_provider: null, cover_photographer: null });
  });

  it("leaves the stored cover untouched when an update doesn't mention it", () => {
    expect(Object.keys(toTripRow(tripInput)).some((k) => k.startsWith("cover_"))).toBe(false);
  });

  it("refuses a cover update on a trip the user doesn't own", async () => {
    muteErrorLog();
    const { db } = createFakeDb({ trips: [{ data: [] }] }); // RLS/owner filter matched no row
    const result = await new TripService(db).update("stranger", "trip-1", { ...tripInput, cover });
    expect(result).toMatchObject({ code: "permission_denied" });
  });

  it("the trip form's validation rejects a tampered cover before any write", () => {
    const parsed = tripSchema(en.validation).safeParse({
      ...tripInput,
      cover: { ...cover, url: "https://evil.example/tracker.gif" },
    });
    expect(parsed.success).toBe(false);
  });
});
