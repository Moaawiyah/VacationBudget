import { describe, expect, it } from "vitest";
import { buildDestinationQuery, coverDestinations, normalizePlace } from "@/lib/images/destination-query";

describe("buildDestinationQuery", () => {
  it("prefers city + country when both are known", () => {
    expect(buildDestinationQuery({ city: "Interlaken", country: "Switzerland" })).toBe("Interlaken Switzerland travel");
    expect(buildDestinationQuery({ city: "Zell am See", country: "Austria" })).toBe("Zell am See Austria travel");
  });

  it("uses a landscape query for a country alone", () => {
    expect(buildDestinationQuery({ country: "Switzerland" })).toBe("Switzerland travel landscape");
  });

  it("is deterministic", () => {
    const d = { city: "Munich", country: "Germany" };
    expect(buildDestinationQuery(d)).toBe(buildDestinationQuery({ ...d }));
  });

  it("returns null when nothing usable is left", () => {
    expect(buildDestinationQuery({ country: "   " })).toBeNull();
    expect(buildDestinationQuery({ country: "!!!@@@###" })).toBeNull();
  });
});

describe("normalizePlace — malformed input", () => {
  it("strips search syntax, markup and digits, and collapses whitespace", () => {
    expect(normalizePlace('  Rome"  OR  <script>1=1  ')).toBe("Rome OR script");
  });

  it("keeps non-Latin scripts and diacritics", () => {
    expect(normalizePlace("Zürich")).toBe("Zürich");
    expect(normalizePlace("תל אביב")).toBe("תל אביב");
  });

  it("bounds the length", () => {
    expect(normalizePlace("a".repeat(500))).toHaveLength(60);
  });
});

describe("coverDestinations", () => {
  it("returns every stored country in order — the first is the default", () => {
    expect(coverDestinations("Italy, Switzerland, Germany, Austria")).toEqual([
      { country: "Italy" },
      { country: "Switzerland" },
      { country: "Germany" },
      { country: "Austria" },
    ]);
  });

  it("reads legacy free text ending in a country as city + country", () => {
    expect(coverDestinations("Paris, France")).toEqual([{ city: "Paris", country: "France" }]);
  });

  it("keeps other legacy free text as one place", () => {
    expect(coverDestinations("Tuscany road trip")).toEqual([{ country: "Tuscany road trip" }]);
  });

  it("returns nothing for an empty destination", () => {
    expect(coverDestinations("")).toEqual([]);
    expect(coverDestinations(null)).toEqual([]);
  });
});
