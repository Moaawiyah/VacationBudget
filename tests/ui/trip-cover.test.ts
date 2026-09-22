import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import { TripCard } from "@/components/trips/trip-card";
import { TripHero } from "@/components/dashboard/trip-hero";
import { toTrip } from "@/types/trip";
import { tripRow } from "../helpers/fixtures";

vi.stubGlobal("React", React);
vi.mock("@/components/i18n/locale-provider", () => ({
  useDictionary: () => en,
  useLocale: () => ({ bcp47: "en-US" }),
}));
vi.mock("@/lib/i18n/server", () => ({
  getDictionary: async () => en,
  getLocale: async () => "en",
}));
// Plain <img> in place of next/image, so the markup shows exactly which src is used.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }),
}));
vi.mock("@/app/trips/actions", () => ({ deleteTrip: vi.fn() }));
// Any search during rendering would call these — none must.
const searchSpy = vi.hoisted(() => vi.fn());
vi.mock("@/lib/images/cover-search", () => ({
  searchDestinationCovers: searchSpy,
  getDestinationImageProvider: searchSpy,
}));
vi.mock("@/app/trips/cover-actions", () => ({ searchTripCovers: searchSpy }));

const COVER_URL = "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&w=1600";
const withCover = toTrip(
  tripRow({
    destination: "Switzerland",
    cover_image_url: COVER_URL,
    cover_image_alt: "Lake",
    cover_provider: "pexels",
    cover_photographer: "Jane Doe",
    cover_photographer_url: "https://www.pexels.com/@jane",
    cover_source_url: "https://www.pexels.com/photo/1/",
  }),
);

describe("trip cover rendering", () => {
  it("renders the stored cover on a trip card without any provider request", async () => {
    const html = renderToStaticMarkup(await TripCard({ trip: withCover, spent: 100 }));
    expect(html).toContain(`src="${COVER_URL.replace(/&/g, "&amp;")}"`);
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it("falls back to the bundled default cover when a trip has none", async () => {
    const html = renderToStaticMarkup(await TripCard({ trip: toTrip(tripRow()), spent: 0 }));
    expect(html).toContain('src="/alpine-lake.jpg"');
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it("credits the photographer and Pexels on the dashboard hero", async () => {
    const html = renderToStaticMarkup(await TripHero({ trip: withCover }));
    expect(html).toContain('href="https://www.pexels.com/@jane"');
    expect(html).toContain("Jane Doe");
    expect(html).toContain('href="https://www.pexels.com/photo/1/"');
  });

  it("shows no attribution for the default cover", async () => {
    const html = renderToStaticMarkup(await TripHero({ trip: toTrip(tripRow()) }));
    expect(html).not.toContain("pexels.com");
  });
});
