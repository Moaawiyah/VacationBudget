import { afterEach, describe, expect, it, vi } from "vitest";
import { PexelsProvider } from "@/lib/images/pexels-provider";
import { ImageProviderError } from "@/lib/images/types";

function photo(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    url: `https://www.pexels.com/photo/lake-${id}/`,
    photographer: "Jane Doe",
    photographer_url: "https://www.pexels.com/@jane",
    alt: "Alpine lake",
    src: {
      original: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`,
      large2x: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&h=650&w=940`,
    },
    ...overrides,
  };
}

function mockFetch(response: Response | Error) {
  const fn = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("PexelsProvider — success", () => {
  it("maps photos to fixed-size cover and thumbnail URLs with full attribution", async () => {
    mockFetch(json({ photos: [photo(1)] }));
    const [image] = await new PexelsProvider("key").searchDestination("Switzerland travel landscape", 6);
    expect(image).toEqual({
      url: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&w=1600",
      thumbnailUrl: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&w=600",
      alt: "Alpine lake",
      provider: "pexels",
      photographer: "Jane Doe",
      photographerUrl: "https://www.pexels.com/@jane",
      sourceUrl: "https://www.pexels.com/photo/lake-1/",
    });
  });

  it("sends only the search query (plus paging/orientation) and the key in the Authorization header", async () => {
    const fetchSpy = mockFetch(json({ photos: [] }));
    await new PexelsProvider("secret-key").searchDestination("Interlaken Switzerland travel", 6);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const params = new URL(url).searchParams;
    expect([...params.keys()].sort()).toEqual(["orientation", "per_page", "query"]);
    expect(params.get("query")).toBe("Interlaken Switzerland travel");
    expect(url).not.toContain("secret-key");
    expect(init.headers).toEqual({ Authorization: "secret-key" });
  });

  it("returns an empty list when there are no results", async () => {
    mockFetch(json({ photos: [] }));
    expect(await new PexelsProvider("key").searchDestination("Nowhere", 6)).toEqual([]);
  });

  it("skips a photo hosted elsewhere or with off-site attribution links, keeping the rest", async () => {
    mockFetch(
      json({
        photos: [
          photo(1, { src: { original: "https://evil.example/photos/1/x.jpeg" } }),
          photo(2, { photographer_url: "https://phish.example/@jane" }),
          photo(3),
        ],
      }),
    );
    const images = await new PexelsProvider("key").searchDestination("Italy", 6);
    expect(images.map((i) => i.url)).toEqual([
      "https://images.pexels.com/photos/3/pexels-photo-3.jpeg?auto=compress&cs=tinysrgb&w=1600",
    ]);
  });
});

describe("PexelsProvider — failures", () => {
  it.each([
    [429, "rate_limited"],
    [401, "rejected"],
    [403, "rejected"],
    [500, "unavailable"],
    [503, "unavailable"],
  ])("maps HTTP %i to %s", async (status, kind) => {
    mockFetch(json({ error: "x" }, status));
    await expect(new PexelsProvider("key").searchDestination("Italy", 6)).rejects.toMatchObject({ kind });
  });

  it("maps an aborted (timed-out) request to timeout", async () => {
    mockFetch(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await expect(new PexelsProvider("key").searchDestination("Italy", 6)).rejects.toMatchObject({ kind: "timeout" });
  });

  it("maps a network failure to unavailable", async () => {
    mockFetch(new TypeError("fetch failed"));
    await expect(new PexelsProvider("key").searchDestination("Italy", 6)).rejects.toBeInstanceOf(ImageProviderError);
  });

  it("maps a malformed body to malformed", async () => {
    mockFetch(new Response("<html>oops</html>", { status: 200 }));
    await expect(new PexelsProvider("key").searchDestination("Italy", 6)).rejects.toMatchObject({ kind: "malformed" });
  });
});
