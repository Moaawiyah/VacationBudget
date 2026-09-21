import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import { TripHeader } from "@/components/navigation/trip-header";

vi.stubGlobal("React", React);
const route = vi.hoisted(() => ({ pathname: "" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("@/components/i18n/locale-provider", () => ({ useDictionary: () => en }));

describe("trip back navigation", () => {
  it.each([
    ["dashboard", "/trips", "Trips"],
    ["expenses", "/trip/one/dashboard", "Dashboard"],
    ["expenses/new", "/trip/one/expenses", "Expenses"],
    ["expenses/receipt", "/trip/one/expenses", "Expenses"],
    ["expenses/expense-1/edit", "/trip/one/expenses", "Expenses"],
    ["analytics", "/trip/one/dashboard", "Dashboard"],
    ["plan", "/trip/one/dashboard", "Dashboard"],
    ["settings", "/trip/one/dashboard", "Dashboard"],
    ["details", "/trip/one/dashboard", "Dashboard"],
    ["expenses/new/", "/trip/one/expenses", "Expenses"],
  ])(
    "provides a safe parent link on %s, including direct page visits",
    (path, href, label) => {
      route.pathname = `/trip/one/${path}`;
      const html = renderToStaticMarkup(
        createElement(TripHeader, { tripId: "one", name: "Alps", destination: "Italy" }),
      );
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(`aria-label="Back: ${label}"`);
      expect(html).toContain("min-h-11");
      if (path !== "dashboard") expect(html).not.toContain("lg:hidden");
    },
  );
});
