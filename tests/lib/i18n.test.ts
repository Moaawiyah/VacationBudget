import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import ar from "@/lib/i18n/dictionaries/ar";
import he from "@/lib/i18n/dictionaries/he";
import { DEFAULT_LOCALE, dirFor, isLocale, LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { translateCategoryName } from "@/lib/i18n/category-names";

/** Every "section.key" path in a dictionary, with its value. */
function entries(dict: object, prefix = ""): Array<[string, unknown]> {
  return Object.entries(dict).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? entries(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value] as [string, unknown]],
  );
}

describe("dictionaries", () => {
  const enKeys = entries(en).map(([key]) => key);

  it.each([
    ["ar", ar],
    ["he", he],
  ])("%s has exactly the same keys as English", (_, dict) => {
    expect(entries(dict).map(([key]) => key)).toEqual(enKeys);
  });

  it.each([
    ["en", en],
    ["ar", ar],
    ["he", he],
  ])("%s has no empty strings", (_, dict) => {
    const empty = entries(dict).filter(([, value]) => value === "");
    expect(empty).toEqual([]);
  });

  it("keeps the same {placeholders} in every translation", () => {
    const tokens = (value: unknown) =>
      String(value)
        .match(/\{\w+\}/g)
        ?.sort() ?? [];
    for (const [key, value] of entries(en)) {
      for (const dict of [ar, he]) {
        const translated = entries(dict).find(([k]) => k === key)?.[1];
        expect([key, tokens(translated)]).toEqual([key, tokens(value)]);
      }
    }
  });
});

describe("locale config", () => {
  it("recognises supported locales only", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
    expect(isLocale("he")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it("marks Hebrew and Arabic as right-to-left", () => {
    expect(dirFor("en")).toBe("ltr");
    expect(dirFor("he")).toBe("rtl");
    expect(dirFor("ar")).toBe("rtl");
  });
});

describe("interpolate", () => {
  it("fills known tokens and leaves unknown ones", () => {
    expect(interpolate("{n}% of {total}", { n: 40, total: "€10" })).toBe("40% of €10");
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });
});

describe("translateCategoryName", () => {
  it("translates system categories and leaves custom ones", () => {
    expect(translateCategoryName("Car Rental", he)).toBe(he.categories.carRental);
    expect(translateCategoryName("My gifts", ar)).toBe("My gifts");
  });
});
