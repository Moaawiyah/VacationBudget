import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import { CompanionManager } from "@/components/trips/companion-manager";
import { InvitationList } from "@/components/invitations/invitation-list";

vi.stubGlobal("React", React);
vi.mock("@/components/i18n/locale-provider", () => ({ useDictionary: () => en }));
vi.mock("@/app/trip/[id]/companions/actions", () => ({
  inviteCompanion: vi.fn(),
  removeCompanion: vi.fn(),
}));
vi.mock("@/app/invitations/actions", () => ({ respondToInvitation: vi.fn() }));

const companions = [
  {
    userId: "owner",
    username: "owner",
    firstName: "Trip",
    surname: "Owner",
    status: "owner" as const,
  },
  {
    userId: "pending",
    username: "pending",
    firstName: "Pat",
    surname: "Pending",
    status: "pending" as const,
  },
  {
    userId: "accepted",
    username: "accepted",
    firstName: "Alex",
    surname: "Accepted",
    status: "accepted" as const,
  },
];

describe("companions UI", () => {
  it("lets only the owner invite and remove companions and fades pending users", () => {
    const owner = renderToStaticMarkup(
      createElement(CompanionManager, {
        tripId: "trip-1",
        initial: companions,
        isOwner: true,
      }),
    );
    expect(owner).toContain(en.travel.addCompanion);
    expect(owner).toContain('id="companion-username"');
    expect(owner).toContain("opacity-45");
    expect(owner.match(new RegExp(`aria-label="${en.travel.remove}"`, "g"))).toHaveLength(
      2,
    );
    const member = renderToStaticMarkup(
      createElement(CompanionManager, {
        tripId: "trip-1",
        initial: companions,
        isOwner: false,
      }),
    );
    expect(member).toContain(en.travel.ownerOnlyCompanions);
    expect(member).not.toContain('id="companion-username"');
    expect(member).not.toContain(`aria-label="${en.travel.remove}"`);
  });

  it("shows invitation messages with accept and ignore controls", () => {
    const html = renderToStaticMarkup(
      createElement(InvitationList, {
        invitations: [
          {
            tripId: "trip-1",
            tripName: "Alps",
            inviterUsername: "owner",
            createdAt: "2026-01-01",
          },
        ],
      }),
    );
    expect(html).toContain("Alps");
    expect(html).toContain("@owner");
    expect(html).toContain(`aria-label="${en.travel.accept}"`);
    expect(html).toContain(`aria-label="${en.travel.ignore}"`);
  });
});
