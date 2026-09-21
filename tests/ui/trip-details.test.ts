import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import { TripHero } from "@/components/dashboard/trip-hero";
import { TripDetailsView } from "@/components/trips/trip-details-view";
import TripDetails from "@/app/trip/[id]/details/page";
import { toTrip } from "@/types/trip";
import { tripRow } from "../helpers/fixtures";

vi.stubGlobal("React", React);
vi.mock("@/lib/i18n/server", () => ({
  getDictionary: async () => en,
  getLocale: async () => "en",
}));
vi.mock("@/lib/sdk/server", () => ({
  requireUser: async () => ({ user: { id: "user-1" } }),
  getSdk: async () => ({
    trips: { get: async () => toTrip(tripRow({ destination: "Italy, France" })) },
    expenses: { listForTrip: async () => [] },
    companions: {
      listForTrip: async () => ({
        isOwner: true,
        companions: [
          {
            userId: "user-1",
            username: "owner",
            firstName: "Trip",
            surname: "Owner",
            status: "owner",
          },
        ],
      }),
    },
  }),
}));

const trip = toTrip(tripRow({ destination: "Italy, France" }));
describe("View trip navigation", () => {
  it("links the dashboard hero to details for the same trip", async () => {
    const html = renderToStaticMarkup(await TripHero({ trip }));
    expect(html).toContain('href="/trip/trip-1/details"');
    expect(html).toContain(en.travel.viewTrip);
  });
  it("renders the details route with destinations and edit actions instead of another dashboard", async () => {
    const html = renderToStaticMarkup(
      await TripDetails({ params: Promise.resolve({ id: trip.id }) }),
    );
    expect(html).toContain(en.travel.tripDetails);
    expect(html).toContain("Italy");
    expect(html).toContain("France");
    expect(html).toContain('href="/trips/trip-1/edit"');
    expect(html).not.toContain(en.travel.viewTrip);
    expect(html).not.toContain(en.travel.greeting);
    expect(html).toContain('href="/trip/trip-1/plan"');
    expect(html).toContain('href="/trip/trip-1/expenses/receipt"');
  });
  it("keeps an empty trip actionable without inventing destinations or expenses", () => {
    const html = renderToStaticMarkup(
      createElement(TripDetailsView, {
        trip: { ...trip, destination: "" },
        expenses: [],
        dict: en,
        bcp47: "en-US",
        companions: [],
        isOwner: true,
      }),
    );
    expect(html).toContain(en.tripForm.destinationPlaceholder);
    expect(html).toContain(en.expenses.noExpensesTitle);
    expect(html).toContain('href="/trip/trip-1/expenses/new"');
  });
});
