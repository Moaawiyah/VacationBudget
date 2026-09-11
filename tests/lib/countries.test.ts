import { describe, expect, it } from "vitest";
import {
  COUNTRY_CODES,
  destinationStorageValue,
  findCountry,
  flagEmoji,
  formatDestination,
  getCountries,
  getDestinationParts,
  normalizeForSearch,
  parseDestination,
  regionName,
  searchCountries,
} from "@/lib/countries";

describe("country catalogue", () => {
  it("builds flag emoji from a code, in any case", () => {
    expect(flagEmoji("fr")).toBe("🇫🇷");
    expect(flagEmoji("IL")).toBe("🇮🇱");
  });

  it("names regions per locale, falling back to the code", () => {
    expect(regionName("DE", "en")).toBe("Germany");
    expect(regionName("DE", "he")).toBe("גרמניה");
  });

  it("lists every country, localized, sorted and cached", () => {
    const en = getCountries("en");
    expect(en).toHaveLength(COUNTRY_CODES.length);
    expect(getCountries("en")).toBe(en);
    const names = en.map((c) => c.name);
    expect(names).toEqual([...names].sort(new Intl.Collator("en").compare));
    expect(getCountries("ar")[0]?.name).not.toBe(en[0]?.name);
  });

  it("normalizes case, accents and apostrophes for search", () => {
    expect(normalizeForSearch("  Côte d’Ivoire ")).toBe("cote divoire");
  });

  it("searches names and codes, prefix matches first", () => {
    const en = getCountries("en");
    expect(searchCountries(en, "")).toBe(en);
    const land = searchCountries(en, "land").map((c) => c.code);
    expect(land.indexOf("FI")).toBeGreaterThan(-1);
    expect(searchCountries(en, "ice")[0]?.code).toBe("IS");
    expect(searchCountries(en, "zzz")).toEqual([]);
  });
});

describe("findCountry", () => {
  it("resolves codes and names in any app language", () => {
    expect(findCountry("fr")).toBe("FR");
    expect(findCountry(" france ")).toBe("FR");
    expect(findCountry("Cote d'Ivoire")).toBe("CI");
    expect(findCountry("فرنسا")).toBe("FR");
    expect(findCountry("צרפת")).toBe("FR");
  });

  it("returns null for anything else", () => {
    expect(findCountry("Paris")).toBeNull();
    expect(findCountry("")).toBeNull();
    expect(findCountry(undefined)).toBeNull();
    expect(findCountry("QQ")).toBeNull();
  });
});

describe("destinations", () => {
  it("parses stored destinations into codes, de-duplicated", () => {
    expect(parseDestination("France, Italy")).toEqual(["FR", "IT"]);
    expect(parseDestination("France, france")).toEqual(["FR"]);
    expect(parseDestination("Paris, France")).toEqual([]);
    expect(parseDestination(null)).toEqual([]);
  });

  it("stores English names joined by commas", () => {
    expect(destinationStorageValue(["FR", "IT"])).toBe("France, Italy");
    expect(destinationStorageValue([])).toBe("");
  });

  it("splits a destination into display parts, keeping legacy text", () => {
    expect(getDestinationParts("France", "he")).toEqual([
      { code: "FR", flag: "🇫🇷", name: "צרפת" },
    ]);
    expect(getDestinationParts(" Paris, France ", "en")).toEqual([
      { code: null, flag: null, name: "Paris, France" },
    ]);
    expect(getDestinationParts("  ", "en")).toEqual([]);
  });

  it("formats one line with locale-aware separators", () => {
    expect(formatDestination("France, Italy", "en")).toBe("🇫🇷 France, 🇮🇹 Italy");
    expect(formatDestination("Paris", "en")).toBe("Paris");
    expect(formatDestination("France, Italy", "ar")).toContain("🇮🇹");
  });
});
