import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("returns relative app paths unchanged", () => {
    expect(safeRedirectPath("/trips")).toBe("/trips");
    expect(safeRedirectPath("/trip/42/expenses?from=upload")).toBe(
      "/trip/42/expenses?from=upload",
    );
    expect(safeRedirectPath("/")).toBe("/");
  });

  it("falls back for absolute and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/trips");
    expect(safeRedirectPath("http://evil.com/phish")).toBe("/trips");
    expect(safeRedirectPath("//evil.com")).toBe("/trips");
    expect(safeRedirectPath("/\\evil.com")).toBe("/trips");
    expect(safeRedirectPath("/\\evil.com", "/login")).toBe("/login");
  });

  it("falls back for non-path values", () => {
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/trips");
    expect(safeRedirectPath("trips")).toBe("/trips");
    expect(safeRedirectPath("")).toBe("/trips");
    expect(safeRedirectPath(null)).toBe("/trips");
    expect(safeRedirectPath(undefined)).toBe("/trips");
  });

  it("falls back when control characters could smuggle headers", () => {
    expect(safeRedirectPath("/trips\r\nSet-Cookie: x=1")).toBe("/trips");
    expect(safeRedirectPath("/trips\n")).toBe("/trips");
    expect(safeRedirectPath("/tri\tps")).toBe("/trips");
    expect(safeRedirectPath("/tr%0Aips")).toBe("/tr%0Aips");
  });
});
