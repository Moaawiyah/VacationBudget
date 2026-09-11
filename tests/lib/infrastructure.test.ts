import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";
import { getURL } from "@/lib/get-url";
import { cn } from "@/lib/utils";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("logger", () => {
  it("writes one JSON line with level, message and fields", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("trip created", { tripId: "t1" });
    const entry = JSON.parse(String(info.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({ level: "info", message: "trip created", tripId: "t1" });
    expect(Number.isNaN(Date.parse(entry.time))).toBe(false);
  });

  it("drops entries below LOG_LEVEL", () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.info("hidden");
    logger.warn("shown");
    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("defaults to info when LOG_LEVEL is unset or invalid", () => {
    vi.stubEnv("LOG_LEVEL", "loud");
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.debug("hidden");
    logger.error("shown");
    expect(debug).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
  });

  it("emits debug entries when LOG_LEVEL=debug", () => {
    vi.stubEnv("LOG_LEVEL", "debug");
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    logger.debug("details");
    expect(debug).toHaveBeenCalledOnce();
  });
});

describe("getURL", () => {
  it("falls back to localhost with a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    expect(getURL()).toBe("http://localhost:3000/");
  });

  it("adds https:// and a trailing slash to a bare domain", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "app.example.com");
    expect(getURL()).toBe("https://app.example.com/");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com/");
    expect(getURL()).toBe("https://app.example.com/");
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
