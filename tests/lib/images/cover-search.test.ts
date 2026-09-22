import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCoverSearchCache,
  getDestinationImageProvider,
  searchDestinationCovers,
} from "@/lib/images/cover-search";
import { PexelsProvider } from "@/lib/images/pexels-provider";
import { ImageProviderError, type DestinationImage, type DestinationImageProvider } from "@/lib/images/types";
import { FALLBACK_COVER_SRC } from "@/lib/images/fallback";

const image: DestinationImage = {
  url: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&w=1600",
  thumbnailUrl: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&w=600",
  alt: "",
  provider: "pexels",
  photographer: "Jane",
  photographerUrl: "https://www.pexels.com/@jane",
  sourceUrl: "https://www.pexels.com/photo/1/",
};

function provider(result: DestinationImage[] | Error): DestinationImageProvider {
  return {
    searchDestination: vi.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  };
}

beforeEach(() => clearCoverSearchCache());
afterEach(() => vi.unstubAllEnvs());

describe("getDestinationImageProvider", () => {
  it("is null without PEXELS_API_KEY — trips then just use the default cover", () => {
    vi.stubEnv("PEXELS_API_KEY", "");
    expect(getDestinationImageProvider()).toBeNull();
  });

  it("builds the Pexels provider when the key is set", () => {
    vi.stubEnv("PEXELS_API_KEY", "key");
    expect(getDestinationImageProvider()).toBeInstanceOf(PexelsProvider);
  });
});

describe("searchDestinationCovers", () => {
  it("reports a missing key as unavailable, without throwing", async () => {
    expect(await searchDestinationCovers(null, { country: "Italy" })).toEqual({
      status: "unavailable",
      reason: "not_configured",
    });
  });

  it("returns the provider's images for the built query", async () => {
    const p = provider([image]);
    expect(await searchDestinationCovers(p, { city: "Milan", country: "Italy" })).toEqual({
      status: "ok",
      images: [image],
    });
    expect(p.searchDestination).toHaveBeenCalledWith("Milan Italy travel", 6);
  });

  it("reports no results as empty", async () => {
    expect(await searchDestinationCovers(provider([]), { country: "Italy" })).toEqual({ status: "empty" });
  });

  it.each(["timeout", "rate_limited", "rejected", "unavailable", "malformed"] as const)(
    "degrades a %s failure to unavailable",
    async (kind) => {
      const result = await searchDestinationCovers(provider(new ImageProviderError(kind, "x")), { country: "Italy" });
      expect(result).toEqual({ status: "unavailable", reason: kind });
    },
  );

  it("answers a repeated query from cache instead of spending API quota", async () => {
    const p = provider([image]);
    await searchDestinationCovers(p, { country: "Italy" });
    await searchDestinationCovers(p, { country: "Italy" });
    expect(p.searchDestination).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failure, so the next attempt can succeed", async () => {
    const failing = provider(new ImageProviderError("timeout", "x"));
    await searchDestinationCovers(failing, { country: "Italy" });
    const working = provider([image]);
    expect((await searchDestinationCovers(working, { country: "Italy" })).status).toBe("ok");
  });

  it("never calls the provider for an unusable destination", async () => {
    const p = provider([image]);
    expect(await searchDestinationCovers(p, { country: "@@@" })).toEqual({ status: "empty" });
    expect(p.searchDestination).not.toHaveBeenCalled();
  });
});

describe("fallback cover", () => {
  it("is the project's own bundled image, not a remote URL", () => {
    expect(FALLBACK_COVER_SRC).toBe("/alpine-lake.jpg");
  });
});
