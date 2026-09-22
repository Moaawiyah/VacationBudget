import { describe, expect, it } from "vitest";
import { coverFromTrip, toCoverColumns, tripCoverSchema, type TripCover } from "@/lib/images/cover-schema";

const cover: TripCover = {
  url: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&w=1600",
  alt: "Lake",
  provider: "pexels",
  photographer: "Jane",
  photographerUrl: "https://www.pexels.com/@jane",
  sourceUrl: "https://www.pexels.com/photo/1/",
};

describe("tripCoverSchema — untrusted cover from the browser", () => {
  it("accepts a well-formed provider cover", () => {
    expect(tripCoverSchema.safeParse(cover).success).toBe(true);
  });

  it.each([
    ["another host", { url: "https://evil.example/photos/1/x.jpeg?auto=compress&cs=tinysrgb&w=1600" }],
    ["an unexpected size/query", { url: "https://images.pexels.com/photos/1/x.jpeg?w=99999" }],
    ["plain http", { url: "http://images.pexels.com/photos/1/x.jpeg?auto=compress&cs=tinysrgb&w=1600" }],
    ["an off-site photographer link", { photographerUrl: "https://phish.example/@jane" }],
    ["an off-site photo page", { sourceUrl: "javascript:alert(1)" }],
    ["another provider", { provider: "unsplash" }],
    ["no photographer", { photographer: "" }],
  ])("rejects %s", (_label, patch) => {
    expect(tripCoverSchema.safeParse({ ...cover, ...patch }).success).toBe(false);
  });
});

describe("cover columns", () => {
  it("round-trips a cover through the trips columns", () => {
    expect(coverFromTrip(toCoverColumns(cover))).toEqual(cover);
  });

  it("null clears every cover column together", () => {
    expect(Object.values(toCoverColumns(null)).every((v) => v === null)).toBe(true);
  });

  it("treats a trip with no (or an incomplete) cover as having none", () => {
    expect(coverFromTrip({})).toBeNull();
    expect(coverFromTrip({ ...toCoverColumns(cover), cover_photographer: null })).toBeNull();
  });
});
