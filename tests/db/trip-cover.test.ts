import { beforeEach, describe, expect, it } from "vitest";
import { asUser, errorCode } from "./harness";
import { MEMBER, OWNER, STRANGER, TRIP, sharedTripScenario, type Scenario } from "./fixture";

const URL = "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&w=1600";

function setCover(s: Scenario, userId: string, overrides: Record<string, string | null> = {}) {
  const cover = {
    cover_image_url: URL,
    cover_provider: "pexels",
    cover_photographer: "Jane",
    cover_photographer_url: "https://www.pexels.com/@jane",
    cover_source_url: "https://www.pexels.com/photo/1/",
    ...overrides,
  };
  return asUser(s.db, userId, () =>
    s.db.query(
      `update public.trips set cover_image_url = $2, cover_provider = $3, cover_photographer = $4,
         cover_photographer_url = $5, cover_source_url = $6 where id = $1 returning id`,
      [
        TRIP,
        cover.cover_image_url,
        cover.cover_provider,
        cover.cover_photographer,
        cover.cover_photographer_url,
        cover.cover_source_url,
      ],
    ),
  );
}

let s: Scenario;
beforeEach(async () => {
  s = await sharedTripScenario();
});

describe("trip cover (0018)", () => {
  it("lets the owner set a complete cover", async () => {
    const { rows } = await setCover(s, OWNER);
    expect(rows).toHaveLength(1);
  });

  it("does not let a trip member or a stranger change the cover (RLS)", async () => {
    for (const user of [MEMBER, STRANGER]) {
      const { rows } = await setCover(s, user);
      expect(rows).toHaveLength(0);
    }
    const { rows } = await s.db.query<{ cover_image_url: string | null }>(
      "select cover_image_url from public.trips where id = $1",
      [TRIP],
    );
    expect(rows[0].cover_image_url).toBeNull();
  });

  it.each([
    ["an image on another host", { cover_image_url: "https://evil.example/photos/1/x.jpeg?auto=compress&cs=tinysrgb&w=1600" }],
    ["an off-site attribution link", { cover_photographer_url: "https://phish.example/@jane" }],
    ["an unknown provider", { cover_provider: "unsplash" }],
    ["an image without its attribution", { cover_photographer: null }],
  ])("rejects %s", async (_label, overrides) => {
    expect(await errorCode(() => setCover(s, OWNER, overrides))).toBe("23514");
  });

  it("clearing the cover (all columns null) is allowed", async () => {
    await setCover(s, OWNER);
    const nulls = {
      cover_image_url: null,
      cover_provider: null,
      cover_photographer: null,
      cover_photographer_url: null,
      cover_source_url: null,
    };
    expect(await errorCode(() => setCover(s, OWNER, nulls))).toBeNull();
  });
});
